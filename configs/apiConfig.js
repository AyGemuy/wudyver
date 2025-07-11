import CryptoJS from "crypto-js";
const parseIntOrDefault = value => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Warning: Environment variable for integer parsing is invalid.`);
    return null;
  }
  return parsed;
};
const generateJwtSecret = (domainUrl, password) => {
  if (!domainUrl || !password) {
    console.error("Configuration Error: Missing DOMAIN_URL or PASSWORD for secret generation.");
    return null;
  }
  const dataToHash = domainUrl;
  const secret = password;
  return CryptoJS.HmacSHA256(dataToHash, secret).toString();
};
const PASSWORD = process.env.NEXT_PUBLIC_PASSWORD || "";
const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI || "";
const DOMAIN_URL = process.env.NEXT_PUBLIC_DOMAIN_URL || "wudysoft.xyz";
const DOMAIN_CF = process.env.NEXT_PUBLIC_DOMAIN_CF || "api.yogik.id";
const EMAIL = process.env.NEXT_PUBLIC_EMAIL || "wudysoft@mail.com";
const LIMIT_POINTS = parseIntOrDefault(process.env.NEXT_PUBLIC_LIMIT_POINTS || 30);
const LIMIT_DURATION = parseIntOrDefault(process.env.NEXT_PUBLIC_LIMIT_DURATION || 60);
const SONIVA_KEY = process.env.NEXT_PUBLIC_SONIVA_KEY || "";
const SUNOAPI_KEY = process.env.NEXT_PUBLIC_SUNOAPI_KEY || "";
const JWT_SECRET = generateJwtSecret(DOMAIN_URL, PASSWORD);
const validateEssentialConfig = () => {
  if (!PASSWORD) {
    console.error("FATAL CONFIG ERROR: PASSWORD is not defined.");
  }
  if (!MONGODB_URI) {
    console.error("FATAL CONFIG ERROR: MONGODB_URI is not defined.");
  }
  if (!DOMAIN_URL) {
    console.error("FATAL CONFIG ERROR: DOMAIN_URL is not defined.");
  }
  if (JWT_SECRET === null) {
    console.error("FATAL CONFIG ERROR: Failed to generate a valid application secret.");
  }
};
validateEssentialConfig();
const apiConfig = {
  PASSWORD: PASSWORD,
  MONGODB_URI: MONGODB_URI,
  DOMAIN_URL: DOMAIN_URL,
  DOMAIN_CF: DOMAIN_CF,
  EMAIL: EMAIL,
  LIMIT_POINTS: LIMIT_POINTS,
  LIMIT_DURATION: LIMIT_DURATION,
  JWT_SECRET: JWT_SECRET,
  SONIVA_KEY: SONIVA_KEY,
  SUNOAPI_KEY: SUNOAPI_KEY
};
export default apiConfig;