import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as jwt from "jsonwebtoken";

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
        let userId = `mock-id-${Math.floor(Math.random() * 1000)}`;
        let userName = credentials.username.split('@')[0].toUpperCase();

        const mockMembers = [
          { id: "M-2023-112", name: "DELA CRUZ, JUAN" },
          { id: "M-2026-999", name: "VINLUAN, VEN" },
          { id: "M-2020-028", name: "CRUZ, PATRICIA M." },
          { id: "M-2021-055", name: "BAUTISTA, HENRY N." },
          { id: "M-2022-041", name: "FLORES, ANA GRACE" },
          { id: "M-2023-088", name: "CASTILLO, JORGE R." },
          { id: "M-2024-012", name: "AQUINO, CECILIA V." },
          { id: "M-2021-066", name: "NAVARRO, DENNIS L." },
          { id: "M-2018-099", name: "RAMIREZ, DANTE G." },
          { id: "M-2019-044", name: "SANTIAGO, ELENA M." },
          { id: "M-2020-008", name: "DOMINGO, FELIPE K." },
          { id: "M-2022-045", name: "SANTOS, MARIA LUZ" },
          { id: "M-2024-078", name: "REYES, ARMANDO P." },
          { id: "M-2021-033", name: "GARCIA, LORNA S." },
          { id: "M-2023-099", name: "MENDOZA, ROBERTO C." },
          { id: "M-2020-011", name: "TORRES, ELENA F." },
          { id: "M-2022-067", name: "VILLANUEVA, MARK J." },
          { id: "M-2023-031", name: "SORIANO, MARK T." },
          { id: "M-2022-019", name: "PADILLA, ROSE ANN" }
        ];

        // Match by ID (exact/partial) or Name (partial)
        const matchedMember = mockMembers.find(m => 
          inputId === m.id.toLowerCase() || 
          inputId.includes(m.id.toLowerCase()) ||
          m.name.toLowerCase().includes(inputId) ||
          inputId.includes(m.name.toLowerCase())
        );

        if (matchedMember) {
          mockRole = "Member";
          userId = matchedMember.id;
          userName = matchedMember.name;
        } else if (inputId.includes("superadmin")) {
          mockRole = "Superadmin";
        } else if (inputId.includes("admin")) {
          mockRole = "Officer/Admin";
        } else if (inputId.includes("treasurer")) {
          mockRole = "Treasurer";
        } else if (inputId.includes("auditor")) {
          mockRole = "Auditor";
        } else if (inputId.includes("user")) {
          mockRole = "User";
        }

        const payload = {
          userId,
          email: credentials.username,
          role: mockRole
        };
        const accessToken = jwt.sign(payload, "your_jwt_secret_here", { expiresIn: '1h' });

        return {
          id: userId,
          name: userName,
          email: credentials.username,
          role: mockRole,
          accessToken
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
        token.id = user.id;
      }
      return token;
    },
    // Expose the mapped role and id to the frontend session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
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