import axios from "axios";
import FormData from "form-data";
class GhibliAPI {
  constructor() {
    this.api = {
      base: "https://api.code12.cloud",
      endpoints: {
        paygate: slug => `/app/paygate-oauth${slug}`,
        ghibli: slug => `/app/v2/ghibli/user-image${slug}`
      }
    };
    this.creds = {
      appId: "DKTECH_GHIBLI_Dktechinc",
      secretKey: "r0R5EKFarseRwqUIB8gLPdFvNmPm8rN63"
    };
    const studioNames = ["ghibli-howl-moving-castle-anime", "ghibli-spirited-away-anime", "ghibli-my-neighbor-totoro-anime", "ghibli-ponyo-anime", "ghibli-grave-of-fireflies-anime", "ghibli-princess-mononoke-anime", "ghibli-kaguya-anime"];
    this.studios = studioNames.map((name, index) => ({
      name: name,
      index: index
    }));
    this.headers = {
      "user-agent": "NB Android/1.0.0",
      "accept-encoding": "gzip"
    };
    this.db = {
      token: null,
      tokenExpire: null,
      encryptionKey: null
    };
  }
  log(message, level = "info") {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      if (level === "error") {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    } catch (error) {
      console.error(`[LOG_ERROR] Failed to log message: ${error.message}`);
    }
  }
  readDB() {
    try {
      return this.db;
    } catch (error) {
      this.log(`Failed to read from storage: ${error.message}`, "error");
      return null;
    }
  }
  writeDB(data) {
    try {
      this.db = {
        ...this.db,
        ...data
      };
      this.log("Storage updated successfully");
      return true;
    } catch (error) {
      this.log(`Failed to update storage: ${error.message}`, "error");
      return false;
    }
  }
  getStudioId(identifier) {
    try {
      const studio = this.studios.find(s => s.name === identifier || s.index == identifier);
      return studio ? studio.name : null;
    } catch (error) {
      this.log(`Error getting studio ID: ${error.message}`, "error");
      return null;
    }
  }
  async getNewToken() {
    try {
      const url = `${this.api.base}${this.api.endpoints.paygate("/token")}`;
      this.log("Requesting new token from API");
      const res = await axios.post(url, {
        appId: this.creds.appId,
        secretKey: this.creds.secretKey
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        validateStatus: () => true,
        timeout: 3e4
      });
      if (res.status !== 200 || res.data?.status?.code !== "200") {
        const errorMessage = res.data?.status?.message || "Failed to retrieve token";
        this.log(`Token request failed: ${errorMessage}`, "error");
        return {
          success: false,
          code: res.status || 500,
          result: {
            error: errorMessage
          }
        };
      }
      const {
        token,
        tokenExpire,
        encryptionKey
      } = res.data.data;
      this.writeDB({
        token: token,
        tokenExpire: tokenExpire,
        encryptionKey: encryptionKey
      });
      return {
        success: true,
        code: 200,
        result: {
          token: token,
          tokenExpire: tokenExpire,
          encryptionKey: encryptionKey
        }
      };
    } catch (error) {
      this.log(`Unexpected error during token request: ${error.message}`, "error");
      return {
        success: false,
        code: error?.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async getToken() {
    try {
      const db = this.readDB();
      const now = Date.now();
      if (db && db.token && db.tokenExpire && now < db.tokenExpire) {
        this.log("Using existing token from storage");
        return {
          success: true,
          code: 200,
          result: db
        };
      }
      this.log("Token expired or missing, requesting new token");
      return await this.getNewToken();
    } catch (error) {
      this.log(`Error in getToken: ${error.message}`, "error");
      return {
        success: false,
        code: 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async generate({
    imageUrl,
    studio = 6
  }) {
    try {
      if (!imageUrl) {
        this.log("No image provided for generation", "error");
        return {
          success: false,
          code: 400,
          result: {
            error: "imageUrl is required"
          }
        };
      }
      const studioId = this.getStudioId(studio);
      if (!studioId) {
        this.log(`Invalid studio identifier: ${studio}`, "error");
        return {
          success: false,
          code: 400,
          result: {
            error: `Studio must be a valid index or name.\nAvailable studios: ${this.studios.map(s => `[${s.index}] ${s.name}`).join(", ")}`
          }
        };
      }
      const tokenResult = await this.getToken();
      if (!tokenResult.success) return tokenResult;
      const {
        token
      } = tokenResult.result;
      const form = new FormData();
      form.append("studio", studioId);
      let imageBuffer;
      let contentType = "image/jpeg";
      if (Buffer.isBuffer(imageUrl)) {
        this.log("Using image from buffer");
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("data:image")) {
        this.log("Using image from base64 data URL");
        const parts = imageUrl.split(",");
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const base64Data = parts[1];
        contentType = mimeType || contentType;
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        this.log(`Fetching image from URL: ${imageUrl}`);
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          imageBuffer = Buffer.from(imageResponse.data);
          contentType = imageResponse.headers["content-type"] || contentType;
        } catch (error) {
          this.log(`Failed to fetch image from URL: ${error.message}`, "error");
          return {
            success: false,
            code: 400,
            result: {
              error: `Failed to fetch image from URL: ${error.message}`
            }
          };
        }
      }
      form.append("file", imageBuffer, {
        filename: "image.jpg",
        contentType: contentType
      });
      const url = `${this.api.base}${this.api.endpoints.ghibli("/edit-theme")}?uuid=1212`;
      this.log(`Sending image generation request for studio: ${studioId}`);
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          ...this.headers,
          authorization: `Bearer ${token}`
        },
        validateStatus: () => true,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 6e4
      });
      if (res.status !== 200 || res.data?.status?.code !== "200") {
        const errorMessage = res.data?.status?.message || res.data?.message || `HTTP ${res.status}`;
        this.log(`Image generation failed: ${errorMessage}`, "error");
        return {
          success: false,
          code: res.status || 500,
          result: {
            error: errorMessage
          }
        };
      }
      const {
        imageId,
        imageUrl: generatedImageUrl,
        imageOriginalLink
      } = res.data.data;
      this.log("Image generated successfully");
      return {
        success: true,
        code: 200,
        result: {
          imageId: imageId,
          imageUrl: generatedImageUrl,
          imageOriginalLink: imageOriginalLink
        }
      };
    } catch (error) {
      this.log(`Unexpected error during image generation: ${error.message}`, "error");
      return {
        success: false,
        code: error?.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const ghibli = new GhibliAPI();
    const response = await ghibli.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}