import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const allowedGithubId = process.env.GITHUB_ALLOWED_USER_ID;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/admin/login"
  },
  callbacks: {
    async signIn({ profile }) {
      if (!allowedGithubId) {
        return false;
      }

      const githubId = String((profile as { id?: string | number } | null)?.id ?? "");
      return githubId === allowedGithubId;
    },
    async jwt({ token, profile }) {
      if (profile) {
        (token as { githubId?: string }).githubId = String((profile as { id?: string | number }).id ?? "");
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String((token as { githubId?: string }).githubId ?? token.sub ?? "");
      }

      return session;
    }
  }
});
