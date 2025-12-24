const env = process?.env || {};
const apiConfig = {
  PASSWORD: env.MY_PASSWORD || "",
  MONGODB_URI: env.MY_MONGODB_URI || "",
  DOMAIN_URL: env.MY_DOMAIN_URL || "wudysoft.xyz",
  DOMAIN_KOYEB: env.MY_DOMAIN_KOYEB || "wudysoft.koyeb.app",
  DOMAIN_VERCEL: env.MY_DOMAIN_VERCEL || "koyeb-api-wudy-team.vercel.app",
  EMAIL: env.MY_EMAIL || "wudysoft@mail.com",
  LIMIT_POINTS: Number(env.MY_LIMIT_POINTS) || 30,
  LIMIT_DURATION: Number(env.MY_LIMIT_DURATION) || 60,
  JWT_SECRET: env.MY_NEXTAUTH_SECRET || env.NEXTAUTH_SECRET || "",
  GOOGLE_CLIENT_ID: env.MY_GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: env.MY_GOOGLE_CLIENT_SECRET || "",
  GITHUB_ID: env.MY_GITHUB_ID || "",
  GITHUB_SECRET: env.MY_GITHUB_SECRET || "",
  SONIVA_KEY: env.MY_SONIVA_KEY || "",
  SUNOAPI_KEY: env.MY_SUNOAPI_KEY || ""
};
const missingConfigs = Object.entries(apiConfig).filter(([_, value]) => typeof value === "string" && value.trim() === "").map(([key]) => key);
if (missingConfigs.length > 0) {
  console.warn(`Missing config: ${missingConfigs.join(", ")}`);
} else {
  console.log("All configs validated successfully.");
}
export default apiConfig;