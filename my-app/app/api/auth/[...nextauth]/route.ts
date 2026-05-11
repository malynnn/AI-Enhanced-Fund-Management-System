import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "MS Account",
      credentials: {
        username: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          // 1. Authenticate with Membership System (MS)
          const msLoginRes = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!msLoginRes.ok) throw new Error("Invalid Employee ID or Password");
          const { token } = await msLoginRes.json();

          // 2. Validate via MS /auth/me endpoint
          const msUserRes = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/me`, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          if (!msUserRes.ok) throw new Error("Failed to validate MS token");
          const msUser = await msUserRes.json();

          // 3. Implement FS Role Mapper
          let fsRole = null;
          const originalRole = msUser.role?.toLowerCase() || '';

          if (originalRole.includes('admin')) {
            fsRole = 'Officer/Admin'; // Maps to full access
          } else if (originalRole.includes('treasurer') || originalRole.includes('finance')) {
            fsRole = 'Treasurer'; // Maps to view+post
          } else if (originalRole.includes('auditor')) {
            fsRole = 'Auditor'; // Maps to read-only
          }

          // 4. Reject requests from MS roles not mapped to FS roles
          if (!fsRole) {
            throw new Error("403 Forbidden: MS Role not authorized for Finance System");
          }

          return {
            id: msUser.id,
            name: msUser.name || msUser.username,
            role: fsRole,
            accessToken: token 
          };

        } catch (error: any) {
          throw new Error(error.message || "Authentication failed");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Points to our custom UI
  },
  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };