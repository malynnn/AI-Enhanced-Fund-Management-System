import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Mock Account",
      credentials: {
        username: { label: "Email / Employee ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const inputId = credentials.username.toLowerCase();
        let mockRole = "User"; // Default role

        // Mock Role Mapper based on the username/email typed
        if (inputId.includes("superadmin")) {
          mockRole = "Superadmin";
        } else if (inputId.includes("admin")) {
          mockRole = "Officer/Admin"; // Matches your Sidebar's role array perfectly
        } else if (inputId.includes("treasurer")) {
          mockRole = "Treasurer";
        } else if (inputId.includes("auditor")) {
          mockRole = "Auditor";
        } else if (inputId.includes("user")) {
          mockRole = "User";
        }

        // Return a fake user session
        return {
          id: `mock-id-${Math.floor(Math.random() * 1000)}`,
          name: credentials.username.split('@')[0].toUpperCase(), // Uses part of the email as the name
          email: credentials.username,
          role: mockRole,
          accessToken: "mock-jwt-token-12345"
        };
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
    signIn: '/login', 
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };