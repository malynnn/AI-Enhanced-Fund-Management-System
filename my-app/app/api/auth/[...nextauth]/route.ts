import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "MS Account",
      credentials: {
        username: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "Verification Code", type: "text" } // Added OTP field
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.otp) {
          throw new Error("Missing credentials or verification code");
        }

        // ==========================================
        // ⚠️ DEVELOPMENT MOCK LOGIN (With 2FA bypass)
        // ==========================================
        const magicPassword = credentials.password.toLowerCase();
        
        // Mocking 2FA logic: For dev purposes, accept '1234' as the correct 4-digit code
        if (credentials.otp !== "1234") {
          throw new Error("Invalid verification code.");
        }

        let mockRole = "";
        if (magicPassword === "admin") mockRole = "Superadmin";
        else if (magicPassword === "treasurer") mockRole = "Treasurer";
        else if (magicPassword === "auditor") mockRole = "Auditor";
        else if (magicPassword === "user") mockRole = "User";
        else throw new Error("Invalid credentials");

        return {
          id: "dev-mock-id",
          name: credentials.username,
          role: mockRole,
          accessToken: "mock-jwt-token-12345"
        };

        // ==========================================
        // 🛑 REAL BACKEND CODE (COMMENTED OUT) 🛑
        // ==========================================
        /*
        try {
          // Send all 3 pieces of data to the backend endpoint
          const msLoginRes = await fetch(`${process.env.NEXT_PUBLIC_MS_API_URL}/auth/verify-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
              otp: credentials.otp // Backend validates this code before returning JWT
            }),
          });

          if (!msLoginRes.ok) throw new Error("Invalid credentials or verification code");
          const { token } = await msLoginRes.json();

          // ... (rest of the /auth/me mapping logic stays the exact same)
        */
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
  pages: { signIn: '/login' },
  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };