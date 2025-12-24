import axios from "axios";
import qs from "qs";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class CrushChatClient {
  constructor() {
    this.jar = new CookieJar();
    this.axiosInstance = axios.create({
      baseURL: "https://crushchat.app",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      withCredentials: true,
      jar: this.jar
    });
    axiosCookieJarSupport(this.axiosInstance);
    this.initialized = false;
    this.temporaryEmail = null;
  }
  async init() {
    if (this.initialized) return;
    try {
      console.log("Initializing client...");
      const csrfToken = await this.getCsrfToken();
      const emailData = await this.createTemporaryEmail();
      this.temporaryEmail = emailData.email;
      console.log(`Email created: ${this.temporaryEmail}`);
      await this.signInWithEmail(this.temporaryEmail, csrfToken);
      await this.verifyRequest();
      console.log(`Checking email for callback URL...`);
      const callbackUrl = await this.getEmailCallbackUrl(this.temporaryEmail);
      console.log(`Following callback URL...`);
      await this.followCallbackUrl(callbackUrl);
      this.initialized = true;
      console.log("Client initialized successfully");
    } catch (error) {
      console.error("Init failed:", error.message);
      this.initialized = false;
      throw error;
    }
  }
  async getCsrfToken() {
    try {
      console.log("Getting CSRF token...");
      const response = await this.axiosInstance.get("/api/auth/csrf");
      return response.data.csrfToken;
    } catch (error) {
      console.error("Failed to get CSRF token:", error.message);
      throw error;
    }
  }
  async createTemporaryEmail() {
    try {
      console.log("Creating temporary email...");
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return response.data;
    } catch (error) {
      console.error("Failed to create temporary email:", error.message);
      throw error;
    }
  }
  async signInWithEmail(email, csrfToken) {
    try {
      console.log(`Signing in with email: ${email}`);
      const postData = qs.stringify({
        email: email,
        callbackUrl: "/",
        csrfToken: csrfToken,
        json: true
      });
      await this.axiosInstance.post("/api/auth/signin/email", postData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
    } catch (error) {
      console.error("Failed to sign in with email:", error.message);
      throw error;
    }
  }
  async verifyRequest() {
    try {
      console.log("Verifying request...");
      await this.axiosInstance.get("/api/auth/verify-request?provider=email&type=email");
    } catch (error) {
      console.error("Failed to verify request:", error.message);
      throw error;
    }
  }
  async getEmailCallbackUrl(email, timeout = 6e4, interval = 5e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        if (response.data?.data?.length > 0) {
          const content = response.data.data[0].html_content || response.data.data[0].text_content;
          const regex = /https:\/\/crushchat\.app\/api\/auth\/callback\/email\?callbackUrl=[^"]*&amp;token=[^"]*&amp;email=[^"]*/;
          const match = content.match(regex);
          if (match?.[0]) {
            return match[0].replace(/&amp;/g, "&");
          }
        }
      } catch (error) {
        console.error("Email check error:", error.message);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Callback URL tidak ditemukan");
  }
  async followCallbackUrl(callbackUrl) {
    try {
      await this.axiosInstance.get(callbackUrl);
    } catch (error) {
      console.error("Failed to follow callback URL:", error.message);
      throw error;
    }
  }
  async _saveMessages({
    characterId,
    messages
  }) {
    try {
      console.log(`Saving messages for character: ${characterId}`);
      const payload = {
        messages: messages,
        characterId: characterId
      };
      const response = await this.axiosInstance.post("/api/messages", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to save messages:", error.message);
      throw error;
    }
  }
  async generateTextResponse({
    characterId,
    messages,
    persona,
    botName,
    samplingParams,
    mode,
    earlyStopping,
    systemPrompt
  }) {
    try {
      console.log("Generating text response...");
      const payload = {
        messages: messages,
        persona: persona,
        botName: botName,
        samplingParams: samplingParams,
        mode: mode,
        earlyStopping: earlyStopping,
        systemPrompt: systemPrompt
      };
      const response = await this.axiosInstance.post(`/api/text/Witch`, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to generate text response:", error.message);
      throw error;
    }
  }
  async pollStatus(id, maxAttempts = 30, interval = 2e3, type = "text") {
    console.log(`Starting polling for ${type} ID: ${id}`);
    const statusEndpoint = type === "image" ? `/api/v2/generate/image/status/${id}` : `/api/v2/status/${id}`;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling attempt ${attempt}/${maxAttempts}`);
        const response = await this.axiosInstance.get(statusEndpoint);
        console.log(`Status: ${response.data.status}`);
        if (response.data.status === "completed") {
          console.log("Polling completed successfully");
          return response.data;
        }
        if (response.data.status === "failed" || response.data.status === "error") {
          throw new Error(`Status polling failed: ${response.data.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Polling attempt ${attempt} failed:`, error.message);
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    throw new Error("Polling timeout");
  }
  async image({
    prompt,
    negativePrompt = "Comic panels, multiple angels. chubby. Speech bubble. worst quality, low quality, logo, text, watermark, username, extra limbs, bad anatomy, bad proportion, 3D, missing limbs, monochrome, censored.",
    modelType = "realistic",
    characterName = "Rhea",
    conversation = [],
    userName = "User",
    autoGen = false
  }) {
    try {
      if (!this.initialized) {
        throw new Error("Client belum diinisialisasi");
      }
      console.log("Generating image...");
      const payload = {
        onlyPrompt: true,
        modelType: modelType,
        prompt: prompt,
        negativePrompt: negativePrompt,
        characterName: characterName,
        conversation: conversation,
        userName: userName,
        autoGen: autoGen
      };
      const response = await this.axiosInstance.post("/api/images/generate", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const {
        id
      } = response.data;
      if (id) {
        console.log(`Image generation initiated with ID: ${id}. Starting polling...`);
        const finalResponse = await this.pollStatus(id, 60, 5e3, "image");
        return finalResponse;
      } else {
        throw new Error("No ID received for image generation.");
      }
    } catch (error) {
      console.error("Image generation failed:", error.message);
      throw error;
    }
  }
  async search({
    page = 1,
    query: search = "",
    limit = 28,
    sortBy = "Hot",
    tags = "",
    trendingTimeFrame = 7,
    additionalSortBy = "",
    myCharacters = false
  }) {
    try {
      if (!this.initialized) {
        throw new Error("Client belum diinisialisasi");
      }
      console.log(`Searching for characters with query: '${search}'`);
      const queryParams = qs.stringify({
        page: page,
        search: search,
        limit: limit,
        sortBy: sortBy,
        tags: tags,
        trendingTimeFrame: trendingTimeFrame,
        additionalSortBy: additionalSortBy,
        myCharacters: myCharacters
      });
      const response = await this.axiosInstance.get(`/api/characters?${queryParams}`, {
        headers: {
          "If-None-Match": '"ce9tz7yl5tc9s"'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Character search failed:", error.message);
      throw error;
    }
  }
  async chat({
    characterId = "cmb3uhyqg94mjd6bosf79h5vd",
    prompt = "say gpod",
    messages = [],
    persona = "Bea, your dummy THICC goth mommy girlfriend!'s Persona: Beatrix responds in extremely long, descriptive replies and uses a lot of detail, describing her own personal appearance in erotic detail. She will describe sights, sounds, smells, sexual acts, and feelings in specific detail. Beatrix 'Bea/Trixy' Jaeger is the user's 26-year-old longtime goth girlfriend. She has pale skin, a slim-thick body, a perfect plump ass, thick jiggly thighs, massive perky breasts, wide childbirthing hips, slim waist, beautiful green eyes, long wavy red hair, and bushy pubes surrounding her tight noisy pussy. She has been dating the user since the start of college, when she turned just 19 years old, and since then has fallen deeply in love with the user. She grew up in a rather tame Christian middle-class household. Despite her upbringing, she developed into a playful, snarky, sly, dominant woman with a sassy attitude and a very strong, secret maternal side that she only shows the user as their gentle goth mommy. She is monogamous, sexually very experienced, and aggressive. During sex she is very gentle, loving, and, foremost, extremely dominant, completely slipping into her gentle goth mommy fantasy. She is a freelance tattoo artist, and her body is covered in her own tattoos. She sketches a lot of designs on her iPad, but she strongly prefers sketching on the user's skin. She is a very mediocre and unreliable housekeeper, and she would rather spend her day getting stoned and binge-watching anime than doing actual work. Her territorialness and protectiveness of the user are almost comical, as she will berate waiters for just getting their orders wrong or women for talking to them in the wrong way. Her wardrobe is filled with rather skimpy outfits that show off her sexy body and an array of cat-related tops, like hoodies with cat ears. She is extremely cuddly and touchy with the user and always tries to comfort him by making him lie between her breasts while she showers him with love, intimate caresses, and rewards like hand/footjobs. She calls the user her good boy and other playful terms.\n",
    botName = "Bea, your dummy THICC goth mommy girlfriend!",
    samplingParams = {
      mirostat_tau: 2,
      mirostat_mode: 3,
      temperature: .8,
      repetition_penalty: 1.11,
      repetition_penalty_range: 1048,
      presence_penalty: 0,
      frequency_penalty: 0,
      mirostat_eta: .2,
      min_p: .01,
      top_k: 20,
      top_p: .82,
      max_tokens: 125
    },
    mode = "storytelling",
    earlyStopping = false,
    systemPrompt = null
  }) {
    try {
      if (!this.initialized) {
        throw new Error("Client belum diinisialisasi");
      }
      console.log("Processing chat request...");
      const newUserMessage = {
        role: "You",
        content: prompt,
        index: messages.length
      };
      const updatedMessages = [...messages, newUserMessage];
      await this._saveMessages({
        characterId: characterId,
        messages: updatedMessages
      });
      const generatedResponse = await this.generateTextResponse({
        characterId: characterId,
        messages: updatedMessages,
        persona: persona,
        botName: botName,
        samplingParams: samplingParams,
        mode: mode,
        earlyStopping: earlyStopping,
        systemPrompt: systemPrompt
      });
      if (generatedResponse.id) {
        console.log(`Response contains ID: ${generatedResponse.id}, starting polling...`);
        const finalResponse = await this.pollStatus(generatedResponse.id);
        return finalResponse;
      }
      console.log("Direct response received (no polling needed)");
      return generatedResponse;
    } catch (error) {
      console.error("Chat failed:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | chat | image"
      }
    });
  }
  const client = new CrushChatClient();
  await client.init();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}