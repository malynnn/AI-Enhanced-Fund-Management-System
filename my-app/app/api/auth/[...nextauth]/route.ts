import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Mock MS SSO (Local Dev)",
      credentials: {
        username: { label: "Email (Type 'super', 'admin', or 'user')", type: "text", placeholder: "admin@pup.edu.ph" },
        password: { label: "Password (Type anything)", type: "password" }
      },
// Inside app/api/auth/[...nextauth]/route.ts
      async authorize(credentials) {
        if (!credentials?.username) return null;

        let assignedRole = "User"; 
        const email = credentials.username.toLowerCase();
        
        // Expanded role assignment based on the backlog task
        if (email.includes("super")) assignedRole = "Superadmin";
        else if (email.includes("admin")) assignedRole = "Officer/Admin";
        else if (email.includes("treasurer")) assignedRole = "Treasurer";
        else if (email.includes("auditor")) assignedRole = "Auditor";

        return { 
          id: "1", 
          name: assignedRole, 
          email: credentials.username,
          role: assignedRole 
        } as any;
      }
    })
  ],
  callbacks: {
    // 1. Put the role into the JWT Token
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    // 2. Expose the role to the frontend session
    async session({ session, token }) {
      if (session?.user) (session.user as any).role = token.role;
      return session;
    }
  },
  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };