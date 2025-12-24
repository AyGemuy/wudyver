import axios from "axios";
class DippyApi {
  constructor() {
    this.supabaseAuthBaseUrl = "https://jwtvtseywhwvubpbmlfu.supabase.co";
    this.dippyApiBaseUrl = "https://prod-api.dippy.ai";
    this.accessToken = null;
    this.userUuid = null;
    this.characterStartMessages = {};
    this.characterInfoCache = {};
    this.axiosInstance = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://www.dippy.ai",
        priority: "u=1, i",
        referer: "https://www.dippy.ai/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.anonAuthHeaders = {
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dHZ0c2V5d2h3dnVicGJtbGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDA3NjQ2ODUsImV4cCI6MjAxNjM0MDY4NX0.ZHONBEcTxzp1x2Ovb-NULC5zvFqr4N7oQn1Or554MxM",
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dHZ0c2V5d2h3dnVicGJtbGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDA3NjQ2ODUsImV4cCI6MjAxNjM0MDY4NX0.ZHONBEcTxzp1x2Ovb-NULC5zvFqr4N7oQn1Or554MxM"
    };
  }
  async ensureAuthenticated() {
    if (!this.accessToken || !this.userUuid) {
      console.log("[Auth Process] Authentication required. Attempting anonymous signup...");
      try {
        const signupResponse = await this.signup();
        this.accessToken = signupResponse.access_token;
        this.userUuid = signupResponse.user.id;
        console.log(`[Auth Process] Successfully authenticated. User UUID: ${this.userUuid}`);
      } catch (error) {
        console.error("[Auth Process] Failed to authenticate:", error.message);
        throw new Error("Authentication failed. Cannot proceed with API calls.");
      }
    }
  }
  async signup() {
    const url = `${this.supabaseAuthBaseUrl}/auth/v1/signup`;
    const data = {
      data: {
        first_name: "Anonymous",
        last_name: "User",
        name: "Anonymous User"
      },
      gotrue_meta_security: {}
    };
    try {
      console.log("[Signup] Sending signup request...");
      const response = await this.axiosInstance.post(url, data, {
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "sec-fetch-site": "cross-site",
          ...this.anonAuthHeaders
        }
      });
      console.log("[Signup] Signup successful.");
      return response.data;
    } catch (error) {
      console.error("[Signup] Error during signup:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async createUser() {
    await this.ensureAuthenticated();
    const url = `${this.dippyApiBaseUrl}/users/v2/create_user`;
    const data = {
      first_name: "Anonymous",
      last_name: "User",
      uuid: this.userUuid,
      email: `anonymous-${this.userUuid}@email.com`,
      timezone: "Asia/Makassar",
      age: 21
    };
    try {
      console.log("[User Creation] Checking/Creating user profile...");
      const response = await this.axiosInstance.post(url, data, {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          os: "web",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        }
      });
      console.log(`[User Creation] User profile status: ${response.data.status}`);
      return response.data;
    } catch (error) {
      if (error.response && (error.response.status === 409 || error.response.data && error.response.data.message === "USER_ALREADY_EXISTS")) {
        console.warn("[User Creation] User already exists. Proceeding without recreation.");
        return {
          status: "success",
          message: "USER_ALREADY_EXISTS"
        };
      }
      console.error("[User Creation] Error creating user:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async getUserInfo() {
    await this.ensureAuthenticated();
    const url = `${this.dippyApiBaseUrl}/users/v2/user?uuid=${this.userUuid}`;
    try {
      console.log("[User Info] Fetching user details...");
      const response = await this.axiosInstance.get(url, {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          os: "web",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        }
      });
      console.log(`[User Info] User email: ${response.data.data.email}`);
      return response.data;
    } catch (error) {
      console.error("[User Info] Error getting user info:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async getStartingMessage(characterId) {
    if (this.characterStartMessages[characterId]) {
      console.log(`[Starting Messages] Using cached starting messages for character ${characterId}.`);
      return this.characterStartMessages[characterId];
    }
    await this.ensureAuthenticated();
    const url = `${this.dippyApiBaseUrl}/chat/v2/get_starting_message?character_id=${characterId}&uuid=${this.userUuid}`;
    try {
      console.log(`[Starting Messages] Fetching starting messages for character ${characterId}...`);
      const response = await this.axiosInstance.get(url, {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          os: "web",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        }
      });
      this.characterStartMessages[characterId] = response.data.start_messages;
      console.log(`[Starting Messages] Fetched starting messages for character ${characterId}.`);
      return this.characterStartMessages[characterId];
    } catch (error) {
      console.error(`[Starting Messages] Error getting starting message for character ${characterId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async getCharacterInfo(characterId) {
    if (this.characterInfoCache[characterId]) {
      console.log(`[Character Info] Using cached character info for character ${characterId}.`);
      return this.characterInfoCache[characterId];
    }
    await this.ensureAuthenticated();
    const url = `${this.dippyApiBaseUrl}/character/v2/get_character_info`;
    const data = {
      character_ids: [characterId],
      uuid: this.userUuid
    };
    try {
      console.log(`[Character Info] Fetching info for character ${characterId}...`);
      const response = await this.axiosInstance.post(url, data, {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          os: "web",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        }
      });
      if (response.data.payload && response.data.payload.length > 0) {
        this.characterInfoCache[characterId] = response.data.payload[0];
        console.log(`[Character Info] Fetched info for character ${characterId}.`);
        return this.characterInfoCache[characterId];
      }
      throw new Error(`Character info for ID ${characterId} not found.`);
    } catch (error) {
      console.error(`[Character Info] Error getting character info for ${characterId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    character_id = 32799,
    custom_start_messages = null,
    streaming = "1",
    system_message = "continue",
    image_supported = "true",
    from_home_screen = "0",
    llm_type = "basic",
    enable_suggested_messages = false,
    response_limit = null,
    request_image = true,
    ...rest
  }) {
    try {
      console.log("\n--- Initiating Chat Process ---");
      await this.ensureAuthenticated();
      await this.createUser();
      const startMessages = custom_start_messages || await this.getStartingMessage(character_id);
      await this.getCharacterInfo(character_id);
      const url = `${this.dippyApiBaseUrl}/chatbot/v2/chat`;
      const requestData = {
        character_id: String(character_id),
        streaming: streaming,
        system_message: system_message,
        uuid: this.userUuid,
        image_supported: image_supported,
        from_home_screen: from_home_screen,
        user_message: prompt,
        llm_type: llm_type,
        enable_suggested_messages: enable_suggested_messages,
        response_limit: response_limit,
        request_image: request_image,
        start_messages: startMessages,
        ...rest
      };
      console.log(`[Chat Request] Sending chat message to character ${character_id}...`);
      const response = await this.axiosInstance.post(url, requestData, {
        headers: {
          accept: "text/event-stream",
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        },
        responseType: "text"
      });
      console.log("[Chat Response] Processing streamed response...");
      const lines = response.data.split("\n");
      const parsedResponses = [];
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const jsonString = line.slice(5).trim();
            const parsedJson = JSON.parse(jsonString);
            parsedResponses.push(parsedJson);
          } catch (jsonError) {
            console.warn("[Chat Response] Could not parse JSON from line:", line, jsonError.message);
          }
        }
      }
      const finalResponse = parsedResponses[parsedResponses.length - 1];
      console.log("[Chat Response] Chat process completed successfully.");
      return finalResponse;
    } catch (error) {
      console.error("An error occurred during the chat process:", error.message);
      throw error;
    }
  }
  async search({
    query,
    limit = 20,
    ...rest
  }) {
    try {
      console.log("\n--- Initiating Search Process ---");
      await this.ensureAuthenticated();
      await this.createUser();
      const url = `${this.dippyApiBaseUrl}/search/v2/search_by_character_text`;
      const requestData = {
        limit: limit,
        description: query,
        uuid: this.userUuid,
        ...rest
      };
      console.log(`[Search Request] Searching for characters with query: "${query}"...`);
      const response = await this.axiosInstance.post(url, requestData, {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
          os: "web",
          "sec-fetch-site": "same-site",
          "x-pr": ""
        }
      });
      console.log("[Search Response] Search completed successfully.");
      return response.data;
    } catch (error) {
      console.error("An error occurred during the search process:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const dippy = new DippyApi();
    switch (action) {
      case "chat":
        console.log("Menangani action chat dengan parameter:", params);
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt diperlukan untuk action chat."
          });
        }
        const chatResult = await dippy.chat(params);
        return res.status(200).json(chatResult);
      case "search":
        console.log("Menangani action search dengan parameter:", params);
        if (!params.query) {
          return res.status(400).json({
            error: "Query diperlukan untuk action search."
          });
        }
        const searchResult = await dippy.search(params);
        return res.status(200).json(searchResult);
      default:
        return res.status(400).json({
          error: "action tidak valid. action yang tersedia: 'chat', 'search'."
        });
    }
  } catch (error) {
    console.error("Error dalam rute API:", error.message);
    return res.status(500).json({
      error: `Kesalahan Server Internal: ${error.message}`
    });
  }
}