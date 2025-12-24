import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import apiConfig from "@/configs/apiConfig";
export const authOptions = {
  providers: [CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: {
        label: "Email",
        type: "text"
      },
      password: {
        label: "Password",
        type: "password"
      }
    },
    async authorize(credentials, req) {
      try {
        const res = await fetch(`https://${apiConfig.DOMAIN_URL}/api/auth-v2/sign-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        });
        const result = await res.json();
        if (res.ok && result.user && result.token) {
          const user = result.user;
          return {
            id: user._id,
            name: user.email?.split("@")[0] || "User",
            email: user.email,
            token: result.token,
            isNewSignIn: true
          };
        } else {
          throw new Error(result.message || "Invalid credentials");
        }
      } catch (error) {
        throw new Error(error.message || "Terjadi kesalahan saat login");
      }
    }
  }), GoogleProvider({
    clientId: apiConfig.GOOGLE_CLIENT_ID,
    clientSecret: apiConfig.GOOGLE_CLIENT_SECRET
  }), GithubProvider({
    clientId: apiConfig.GITHUB_ID,
    clientSecret: apiConfig.GITHUB_SECRET
  })],
  callbacks: {
    async jwt({
      token,
      user,
      account,
      isNewUser
    }) {
      token.isNewSignIn = token.isNewSignIn ?? false;
      if (user) {
        token.id = user.id || user._id;
        token.email = user.email;
        token.isNewSignIn = user.isNewSignIn || isNewUser ? true : token.isNewSignIn;
        if (user.token) {
          token.apiToken = user.token;
        }
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        if (isNewUser && !token.isNewSignIn) {
          token.isNewSignIn = true;
        }
      }
      return token;
    },
    async session({
      session,
      token
    }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.isNewSignIn = token.isNewSignIn;
        session.apiToken = token.apiToken;
        session.accessToken = token.accessToken;
        session.provider = token.provider;
        token.isNewSignIn = false;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/not-found"
  },
  secret: apiConfig.JWT_SECRET,
  debug: true
};