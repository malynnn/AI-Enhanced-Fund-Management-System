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
          // 1. Authenticate with the Membership System (MS) backend
          const msLoginRes = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!msLoginRes.ok) {
            throw new Error("Invalid Employee ID or password.");
          }

          const { token } = await msLoginRes.json();

          // 2. Validate token and get the user's raw MS profile
          const msUserRes = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/me`, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          if (!msUserRes.ok) {
            throw new Error("Failed to validate MS token.");
          }

          const msUser = await msUserRes.json();

          // ==========================================
          // 3. IMPLEMENT FS ROLE MAPPER
          // ==========================================
          let fsRole = null;
          const originalRole = msUser.role?.toLowerCase() || '';

          // Admin = Full Access
          if (originalRole.includes('admin') || originalRole.includes('officer')) {
            fsRole = 'Admin'; 
          } 
          // Treasurer = View + Post transactions
          else if (originalRole.includes('treasurer') || originalRole.includes('finance')) {
            fsRole = 'Treasurer';
          } 
          // Internal Auditor = Read-only
          else if (originalRole.includes('auditor')) {
            fsRole = 'Internal Auditor';
          }

          // 4. Reject requests from MS roles not mapped to FS roles (403 Forbidden logic)
          if (!fsRole) {
            throw new Error("403 Forbidden: Your MS Role is not authorized for the Finance System.");
          }

          // Return the mapped user so it saves to the secure session
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
    // Inject the mapped role and token into the JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    // Expose the mapped role to the frontend session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Ties back to your frontend UI
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };