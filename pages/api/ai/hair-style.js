import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class HairStyleChanger {
  constructor() {
    this.cookie = null;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
    this.validOptions = {
      male: ["Straight", "Wavy", "Curly", "Bob", "Pixie Cut", "Layered", "Messy Bun", "Top Knot", "Undercut", "Mohawk", "Crew Cut", "Faux Hawk", "Slicked Back", "Side-Parted", "Center-Parted", "Shag", "Lob", "Angled Bob", "A-Line Bob", "Asymmetrical Bob", "Graduated Bob", "Inverted Bob", "Layered Shag", "Choppy Layers", "Razor Cut", "Perm", "Ombré", "Straightened", "Tousled", "Feathered", "Pageboy", "Dreadlocks", "Cornrows", "Box Braids", "Crochet Braids", "Updo", "Messy Updo", "Knotted Updo", "Banana Clip Updo", "Mohawk Fade"],
      female: ["Straight", "Wavy", "Curly", "Bob", "Pixie Cut", "Layered", "Messy Bun", "High Ponytail", "Low Ponytail", "Braided Ponytail", "French Braid", "Dutch Braid", "Fishtail Braid", "Space Buns", "Top Knot", "Blunt Bangs", "Side-Swept Bangs", "Shag", "Lob", "Angled Bob", "A-Line Bob", "Asymmetrical Bob", "Graduated Bob", "Inverted Bob", "Layered Shag", "Choppy Layers", "Razor Cut", "Perm", "Ombré", "Straightened", "Soft Waves", "Glamorous Waves", "Hollywood Waves", "Finger Waves", "Tousled", "Feathered", "Pageboy", "Pigtails", "Pin Curls", "Rollerset", "Twist Out", "Bantu Knots", "Dreadlocks", "Cornrows", "Box Braids", "Crochet Braids", "Double Dutch Braids", "French Fishtail Braid", "Waterfall Braid", "Rope Braid", "Heart Braid", "Halo Braid", "Crown Braid", "Braided Crown", "Bubble Braid", "Bubble Ponytail", "Ballerina Braids", "Milkmaid Braids", "Bohemian Braids", "Flat Twist", "Crown Twist", "Twisted Bun", "Twisted Half-Updo", "Twist and Pin Updo", "Chignon", "Simple Chignon", "Messy Chignon", "French Twist", "French Twist Updo", "French Roll", "Updo", "Messy Updo", "Knotted Updo", "Ballerina Bun", "Banana Clip Updo", "Beehive", "Bouffant", "Hair Bow", "Half-Up Top Knot", "Half-Up, Half-Down", "Messy Bun with a Headband", "Messy Bun with a Scarf", "Messy Fishtail Braid", "Sideswept Pixie", "Victory Rolls"],
      color: ["Random", "No change", "Jet Black", "Black", "Blue-Black", "Dark Brown", "Medium Brown", "Light Brown", "Chestnut", "Mahogany", "Ash Brown", "Brunette", "Caramel", "Blonde", "Golden Blonde", "Honey Blonde", "Strawberry Blonde", "Platinum Blonde", "Ash Blonde", "Red", "Auburn", "Copper", "Burgundy", "Silver", "White", "Titanium", "Rose Gold", "Blue", "Purple", "Pink", "Green"]
    };
  }
  createAxiosInstance() {
    const baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://hairstyleai.ai",
      priority: "u=1, i",
      referer: "https://hairstyleai.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    return axios.create({
      baseURL: "https://hairstyleai.ai",
      headers: baseHeaders,
      timeout: 3e4,
      withCredentials: true
    });
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
      if (this.cookie) {
        config.headers.Cookie = this.cookie;
      }
      if (config.url === "/api/change-hairstyle") {
        config.headers.referer = "https://hairstyleai.ai/?utm_source=toolify";
      }
      return config;
    }, error => {
      console.error("Request error:", error);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      if (response.headers["set-cookie"]) {
        this.cookie = response.headers["set-cookie"].join("; ");
      }
      return response;
    }, error => {
      console.error("Response error:", error.message);
      if (error.response) {
        console.error("API Response error:", error.response.status, error.response.data);
        error.message = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        console.error("No response received from API");
        error.message = "No response received from hairstyle API";
      }
      return Promise.reject(error);
    });
  }
  async initCredits() {
    try {
      const response = await this.axiosInstance.post("/api/init-credits");
      return response.data;
    } catch (error) {
      console.error("Error initializing credits:", error.message);
      throw new Error(`Failed to initialize credits: ${error.message}`);
    }
  }
  async getUserCredits() {
    try {
      const response = await this.axiosInstance.get("/api/get-user-credits");
      return response.data;
    } catch (error) {
      console.error("Error getting user credits:", error.message);
      throw new Error(`Failed to get user credits: ${error.message}`);
    }
  }
  async getImageBase64(imageUrl) {
    try {
      if (imageUrl.startsWith("data:image/")) {
        return imageUrl;
      }
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      const mimeType = response.headers["content-type"] || "image/jpeg";
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error("Error converting image to base64:", error.message);
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }
  validateInput(hair, color, gender) {
    const errors = [];
    if (!["male", "female"].includes(gender)) {
      errors.push(`Invalid gender: ${gender}. Must be 'male' or 'female'`);
    }
    if (gender && hair && !this.validOptions[gender].includes(hair)) {
      errors.push(`Invalid hairstyle for ${gender}: ${hair}. Valid options: ${this.validOptions[gender].join(", ")}`);
    }
    if (color && !this.validOptions.color.includes(color)) {
      errors.push(`Invalid color: ${color}. Valid options: ${this.validOptions.color.join(", ")}`);
    }
    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join("\n")}`);
    }
  }
  async changeHair({
    imageUrl,
    hair = "Straight",
    color = "Blue-Black",
    gender = "female"
  }) {
    try {
      await this.initCredits();
      await this.getUserCredits();
      this.validateInput(hair, color, gender);
      const base64Image = await this.getImageBase64(imageUrl);
      const requestData = {
        inputImage: base64Image,
        haircut: hair,
        hairColor: color,
        gender: gender
      };
      const response = await this.axiosInstance.post("/api/change-hairstyle", requestData);
      return response.data;
    } catch (error) {
      console.error("Error in changeHair:", error.message);
      throw error;
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
    const hairChanger = new HairStyleChanger();
    const response = await hairChanger.changeHair(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}