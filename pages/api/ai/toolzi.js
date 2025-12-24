import axios from "axios";
import {
  URLSearchParams
} from "url";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class MusicGen {
  constructor(email = null) {
    this.email = email;
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: "https://www.tooliz.pro",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Priority: "u=1, i"
      },
      jar: this.jar,
      withCredentials: true
    }));
    this.api302 = wrapper(axios.create({
      baseURL: "https://api.302.ai",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Origin: "https://ai-music-production.tooliz.pro",
        Referer: "https://ai-music-production.tooliz.pro/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
      },
      jar: this.jar,
      withCredentials: true
    }));
    this.imageApi = wrapper(axios.create({
      baseURL: "https://ai-image-creative-station.tooliz.pro",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Origin: "https://ai-image-creative-station.tooliz.pro",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://ai-image-creative-station.tooliz.pro/en/generation/physical-destruction",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      jar: this.jar,
      withCredentials: true
    }));
    this.csrf = null;
    this.apiKey = null;
    this.uid = null;
    this.isAuthenticated = false;
    this.api.interceptors.request.use(config => {
      if (this.csrf) {
        if (config.method === "post" || config.method === "put") {
          if (config.data instanceof URLSearchParams && !config.data.has("csrfToken")) {
            config.data.set("csrfToken", this.csrf);
          } else if (typeof config.data === "object" && config.data !== null && !config.data.csrfToken) {
            config.data.csrfToken = this.csrf;
          }
        }
      }
      return config;
    }, error => Promise.reject(error));
    this.api302.interceptors.request.use(config => {
      const currentApiKey = config.headers["Authorization"] ? config.headers["Authorization"].replace("Bearer ", "") : this.apiKey;
      if (!currentApiKey) {
        console.warn("[API 302 Request] API key NOT set when making a request to:", config.url);
      }
      return config;
    }, error => Promise.reject(error));
  }
  _attachAuthInfo(data, usedUserId = null, usedApiKey = null) {
    return {
      ...data,
      authInfo: {
        userId: usedUserId || this.uid,
        apiKey: usedApiKey || this.apiKey,
        email: this.email
      }
    };
  }
  async _createTempMail() {
    console.log("Starting: Creating a temporary email address...");
    try {
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      if (!res.data || typeof res.data.email !== "string" || res.data.email.trim() === "") {
        throw new Error("Invalid API response when creating temporary email.");
      }
      this.email = res.data.email;
      console.log("Success: Temporary email created:", this.email);
    } catch (error) {
      console.error("Error: Failed to create temporary email:", error.message);
      throw error;
    }
  }
  async _fetchCsrf() {
    console.log("Starting: Fetching CSRF token...");
    try {
      const res = await this.api.get("/api/auth/csrf", {
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*"
        }
      });
      if (!res.data || typeof res.data.csrfToken !== "string") {
        throw new Error("Invalid CSRF token response.");
      }
      this.csrf = res.data.csrfToken;
      console.log("Success: CSRF token fetched.");
    } catch (error) {
      console.error("Error: Failed to fetch CSRF token:", error.message);
      throw error;
    }
  }
  async _signIn() {
    console.log("Starting: Signing in with email...");
    try {
      const params = new URLSearchParams();
      params.append("email", this.email);
      params.append("redirect", "false");
      params.append("callbackUrl", "/dashboard");
      params.append("csrfToken", this.csrf);
      params.append("json", "true");
      await this.api.post("/api/auth/signin/email", params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
          Origin: "https://www.tooliz.pro",
          Referer: "https://www.tooliz.pro/en/tool/ai-song-creator/552a033e-d416-4f3a-9980-5f09c91fb73d",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        }
      });
      console.log("Success: Sign-in process completed.");
    } catch (error) {
      console.error("Error: Failed to sign in with email:", error.message);
      throw error;
    }
  }
  async _getVerifLink() {
    console.log("Starting: Waiting for verification email...");
    let verifLink = null;
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 3e3;
    while (!verifLink && attempts < maxAttempts) {
      try {
        const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0 && res.data.data[0].text_content) {
          const textContent = res.data.data[0].text_content;
          const match = textContent.match(/\[Activate Account]\((https:\/\/e45acf7ec8df12add600cb342fd8ae07\.us-east-1\.resend-links\.com\/CL0\/[^)]+\/1\/010001[^)]+)\)/);
          if (match && match[1]) {
            verifLink = match[1];
            console.log("Success: Verification link found.");
            return verifLink;
          }
        }
      } catch (error) {
        console.warn(`Warning: Failed to fetch email (attempt ${attempts + 1}/${maxAttempts}): ${error.message}`);
      }
      console.log(`Progress: Retrying in ${delay / 1e3} seconds... (Attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Verification link not received within the expected time.");
  }
  async _activateAcc(verifLink) {
    console.log("Starting: Activating account with verification link...");
    try {
      await this.api.get(verifLink, {
        headers: {
          Accept: "*/*",
          Origin: "https://www.tooliz.pro",
          Referer: "https://www.tooliz.pro/"
        },
        maxRedirects: 10
      });
      const cookies = await this.jar.getCookies("https://www.tooliz.pro");
      const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-next-auth.session-token");
      if (!sessionCookie) {
        throw new Error("Failed to get session token after account activation.");
      }
      console.log("Success: Account activated successfully.");
    } catch (error) {
      console.error("Error: Failed to activate account:", error.message);
      throw error;
    }
  }
  async _getUserId() {
    console.log("Starting: Fetching user ID from dashboard page...");
    try {
      const res = await this.api.get("/en/dashboard", {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          Referer: "https://www.tooliz.pro/"
        }
      });
      const html = res.data;
      const searchKey = "authUserId";
      const parts = html.split(searchKey);
      if (parts.length < 2) {
        throw new Error(`Key '${searchKey}' not found in dashboard page response.`);
      }
      const strAfter = parts[1];
      const valAndRest = strAfter.split(",");
      if (valAndRest.length === 0) {
        throw new Error(`Could not parse userId value after '${searchKey}'.`);
      }
      let potentialUid = valAndRest[0];
      let cleanedUid = "";
      for (let i = 0; i < potentialUid.length; i++) {
        const char = potentialUid[i];
        if (char >= "0" && char <= "9" || char >= "a" && char <= "f" || char >= "A" && char <= "F" || char === "-") {
          cleanedUid += char;
        }
      }
      const uuidPattern = /^[a-f0-9-]{36}$/i;
      if (!uuidPattern.test(cleanedUid)) {
        throw new Error(`Extracted User ID ("${cleanedUid}") is not a valid UUID format.`);
      }
      this.uid = cleanedUid;
      console.log("Success: User ID found.");
    } catch (error) {
      console.error("Error: Failed to fetch user ID:", error.message);
      throw error;
    }
  }
  async _getApiKey() {
    console.log("Starting: Fetching Tooliz API key...");
    try {
      if (!this.uid) {
        throw new Error("User ID not available to fetch API key.");
      }
      const tokenName = `user-tooliz-${this.uid}`;
      const inputData = encodeURIComponent(JSON.stringify({
        0: {
          json: {
            token_name: tokenName
          }
        }
      }));
      const res = await this.api.get(`/api/trpc/edge/apiKey.getInfoByUserId?batch=1&input=${inputData}`, {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Referer: "https://www.tooliz.pro/en/dashboard",
          "X-Trpc-Source": "client"
        }
      });
      if (!res.data || !Array.isArray(res.data) || !res.data[0]?.result?.data?.json?.data?.key) {
        throw new Error("Invalid API Key response structure or API key not found.");
      }
      this.apiKey = res.data[0].result.data.json.data.key;
      console.log("Success: Tooliz API key fetched.");
    } catch (error) {
      console.error("Error: Failed to fetch Tooliz API key:", error.message);
      throw error;
    }
  }
  async _performAuth() {
    if (this.isAuthenticated && this.uid && this.apiKey) {
      console.log("Status: Already authenticated with stored credentials. Skipping authentication process.");
      return true;
    }
    console.log("Starting: Full authentication process...");
    try {
      if (!this.email) {
        await this._createTempMail();
      }
      await this._fetchCsrf();
      await this._signIn();
      const verifLink = await this._getVerifLink();
      await this._activateAcc(verifLink);
      await this._getUserId();
      await this._getApiKey();
      this.isAuthenticated = true;
      console.log("Success: Authentication complete.");
      console.log("Info: Email used:", this.email);
      return true;
    } catch (error) {
      console.error("Error: Authentication failed overall:", error.message);
      this.isAuthenticated = false;
      this.uid = null;
      this.apiKey = null;
      throw error;
    }
  }
  async _prepareApi302Headers(overrideApiKey = null) {
    let effectiveApiKey = overrideApiKey;
    let effectiveUserId = this.uid;
    if (!effectiveApiKey) {
      if (!this.isAuthenticated || !this.apiKey || !this.uid) {
        console.log("Info: No API key provided for this call, attempting to perform full authentication to get credentials.");
        await this._performAuth();
      }
      effectiveApiKey = this.apiKey;
      effectiveUserId = this.uid;
    }
    if (!effectiveApiKey) {
      throw new Error("Authentication failed or API key not available. Cannot proceed with API 302 request.");
    }
    this.api302.defaults.headers.common["Authorization"] = `Bearer ${effectiveApiKey}`;
    return {
      effectiveApiKey: effectiveApiKey,
      effectiveUserId: effectiveUserId
    };
  }
  async txt2img({
    prompt = "A hyper realistic, cinematic illustration depicting Lara Croft",
    size = "1024x1536",
    isOptimize = false,
    userId = null,
    apiKey = null
  }) {
    console.log("Starting: Text-to-image generation...");
    if (!this.isAuthenticated || !this.apiKey) {
      await this._performAuth();
    }
    const payload = {
      prompt: prompt,
      apiKey: this.apiKey,
      isOptimize: isOptimize,
      size: size
    };
    try {
      await this.jar.setCookie("NEXT_LOCALE=en", "https://ai-image-creative-station.tooliz.pro");
      await this.jar.setCookie(`api-key=${this.apiKey}`, "https://ai-image-creative-station.tooliz.pro");
      const res = await this.imageApi.post("/api/gen-img", payload);
      if (!res.data) {
        throw new Error("Invalid image generation response.");
      }
      console.log("Success: Image generation request completed.");
      return this._attachAuthInfo(res.data, userId || this.uid, apiKey || this.apiKey);
    } catch (error) {
      console.error("Error: Failed to generate image:", error.message);
      throw error;
    }
  }
  async lyrics({
    prompt = "A serene and introspective poem about nature and peace",
    userId = null,
    apiKey = null
  }) {
    const {
      effectiveApiKey,
      effectiveUserId
    } = await this._prepareApi302Headers(apiKey);
    if (typeof prompt !== "string" || prompt.trim().length < 10) {
      throw new Error('Paramenter "prompt" for lyric generation must be a string with at least 10 meaningful characters.');
    }
    console.log("Starting: Sending lyrics to Suno API...");
    try {
      const res = await this.api302.post("suno/submit/lyrics", {
        prompt: prompt
      }, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Lang: "en"
        }
      });
      if (!res.data) {
        throw new Error('Suno API reported "Missing parameter prompt". The prompt might be too short or invalid.');
      }
      console.log("Success: Lyrics sent to Suno API.");
      return this._attachAuthInfo(res.data, effectiveUserId, effectiveApiKey);
    } catch (error) {
      console.error("Error: Failed to send lyrics to Suno API:", error.message);
      throw error;
    }
  }
  async suno({
    model = "chirp-v3-5",
    pure = false,
    custom = true,
    musicDesc = "A retro 80s synth-pop track with a dreamy female vocal and pulsating synths.",
    lyrics = "[Verse 1]\nWalking down the neon streets\nCity lights dance to the beats\n[Chorus]\nLost in a dream, a synthwave haze\nLiving for these electric days",
    style = "80s Synthwave Pop",
    title = "Neon Dream",
    userId = null,
    apiKey = null
  }) {
    const {
      effectiveApiKey,
      effectiveUserId
    } = await this._prepareApi302Headers(apiKey);
    if (typeof model !== "string" || model.trim() === "") {
      throw new Error("Suno model is required and must be a non-empty string.");
    }
    let payload = {};
    if (custom) {
      if (!pure && (typeof lyrics !== "string" || lyrics.trim() === "")) {
        throw new Error("Lyrics are required for custom generation unless pure instrumental.");
      }
      if (typeof style !== "string" || style.trim() === "") {
        throw new Error("Style is required for custom generation.");
      }
      if (typeof title !== "string" || title.trim() === "") {
        throw new Error("Title is required for custom generation.");
      }
      payload = {
        prompt: lyrics,
        tags: style,
        mv: model,
        title: title,
        make_instrumental: pure
      };
    } else {
      if (typeof musicDesc !== "string" || musicDesc.trim() === "") {
        throw new Error("Music description is required for auto-generation.");
      }
      payload = {
        gpt_description_prompt: musicDesc,
        mv: model,
        make_instrumental: pure
      };
      if (!pure) {
        payload.tags = musicDesc;
      }
    }
    console.log("Starting: Sending Suno music creation request with payload:", payload);
    try {
      const res = await this.api302.post("suno/submit/music", {
        json: payload
      }, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Lang: "en"
        }
      });
      if (!res.data) {
        throw new Error("Invalid Suno music submission response. Task ID not found or format is incorrect.");
      }
      console.log("Success: Suno music task submitted.");
      return this._attachAuthInfo(res.data, effectiveUserId, effectiveApiKey);
    } catch (error) {
      console.error("Error: Failed to create Suno music:", error.message);
      throw error;
    }
  }
  async getTaskStatus({
    taskId,
    userId = null,
    apiKey = null
  }) {
    const {
      effectiveApiKey,
      effectiveUserId
    } = await this._prepareApi302Headers(apiKey);
    if (typeof taskId !== "string" || taskId.trim() === "") {
      throw new Error("Task ID is required to fetch status.");
    }
    console.log(`Starting: Fetching Suno status for task ${taskId}...`);
    try {
      const res = await this.api302.get(`suno/fetch/${taskId}`, {
        headers: {
          Accept: "application/json",
          Lang: "en"
        }
      });
      if (!res.data) {
        throw new Error("Invalid Suno fetch response structure.");
      }
      console.log("Success: Suno task status fetched.");
      return this._attachAuthInfo(res.data, effectiveUserId, effectiveApiKey);
    } catch (error) {
      console.error(`Error: Failed to fetch Suno status for task ${taskId}:`, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const gen = new MusicGen();
  try {
    let result;
    switch (action) {
      case "suno":
        if (!params.lyrics) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameters: lyrics"
          });
        }
        result = await gen.suno(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            success: false,
            message: "No taskId provided"
          });
        }
        result = await gen.getTaskStatus(params);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameters: prompt"
          });
        }
        result = await gen.lyrics(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameters: prompt"
          });
        }
        result = await gen.txt2img(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Use ?action=suno, ?action=status, ?action=lyrics, ?action=txt2img"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("LitMedia API Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
}