import CryptoJS from "crypto-js";
class ConfigManager {
  constructor() {
    this.PASSWORD = process.env.PASSWORD;
    this.MONGODB_URI = process.env.MONGODB_URI;
    this.DOMAIN_URL = process.env.DOMAIN_URL;
    this.EMAIL = process.env.EMAIL;
    this.LIMIT_POINTS = this._parseIntOrDefault(process.env.LIMIT_POINTS);
    this.LIMIT_DURATION = this._parseIntOrDefault(process.env.LIMIT_DURATION);
    this.JWT_SECRET = this._generateSecret();
    this.SONIVA_KEY = process.env.SONIVA_KEY;
    this.SUNOAPI_KEY = process.env.SUNOAPI_KEY;
    this._validateEssentialConfig();
  }
  _parseIntOrDefault(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(`Warning: Environment variable "${value}" could not be parsed as an integer.`);
      return null;
    }
    return parsed;
  }
  _generateSecret() {
    if (!this.DOMAIN_URL || !this.PASSWORD) {
      console.error("Configuration Error: Missing DOMAIN_URL or PASSWORD for secret generation.");
      return null;
    }
    const dataToHash = this.DOMAIN_URL;
    const secret = this.PASSWORD;
    return CryptoJS.HmacSHA256(dataToHash, secret).toString();
  }
  _validateEssentialConfig() {
    if (!this.PASSWORD) {
      console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_APP_PASSWORD is not defined.");
    }
    if (!this.MONGODB_URI) {
      console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_MONGODB_URI is not defined.");
    }
    if (!this.DOMAIN_URL) {
      console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_DOMAIN_URL is not defined.");
    }
    if (this.JWT_SECRET === null) {
      console.error("FATAL CONFIG ERROR: Failed to generate a valid application secret.");
    }
  }
}
export default new ConfigManager();