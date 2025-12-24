import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class PixelChatApi {
  constructor() {
    this.baseURL = "https://prod.nd-api.com";
    this.defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://pixelchat.ai",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-app-id": "pixelchat",
      "x-country": "",
      "x-guest-userid": this.generateRandomUserId(),
      ...SpoofHead()
    };
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: this.defaultHeaders
    });
    this.typesenseConfig = {
      url: "https://etmzpxgvnid370fyp.a1.typesense.net",
      apiKey: "STHKtT6jrC5z1IozTJHIeSN4qN9oL1s3",
      collection: "public_characters_alias",
      leaderboardApiKey: "BPzMGkIbeEXbbmDjk9QpmVkBuWGQiwMh",
      leaderboardCollection: "creator_leaderboard"
    };
  }
  generateRandomUserId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async updateTypesenseConfig() {
    try {
      const appInfo = await this.getApplicationInfo();
      if (appInfo?.typesenseConfig) {
        this.typesenseConfig = {
          url: this.typesenseConfig.url,
          apiKey: appInfo.typesenseConfig.apiKeyPublicCharacter || this.typesenseConfig.apiKey,
          collection: appInfo.typesenseConfig.collectionNamePublicCharacter || this.typesenseConfig.collection,
          leaderboardApiKey: appInfo.typesenseConfig.apiKeyLeaderboard || this.typesenseConfig.leaderboardApiKey,
          leaderboardCollection: appInfo.typesenseConfig.collectionNameLeaderboard || this.typesenseConfig.leaderboardCollection
        };
        console.log("Typesense config updated successfully");
      }
    } catch (error) {
      console.warn("Failed to update Typesense config, using defaults:", error.message);
    }
  }
  async search({
    query = "",
    page = 1,
    per_page = 48,
    filter_by = "application_ids:pixelchat && tags:!Step-Family && tags:!NSFW && is_nsfw:false",
    sort_by = "num_messages_24h:desc",
    ...rest
  }) {
    try {
      await this.updateTypesenseConfig();
      console.log("Searching for characters with query:", query);
      const params = {
        searches: [{
          query_by: "name,title,tags,creator_username,character_id",
          include_fields: "name,title,tags,creator_username,character_id,avatar_is_nsfw,avatar_url,visibility,definition_visible,num_messages,token_count,rating_score,lora_status,creator_user_id,is_nsfw",
          use_cache: true,
          highlight_fields: "none",
          enable_highlight_v1: false,
          sort_by: sort_by,
          highlight_full_fields: "name,title,tags,creator_username,character_id",
          collection: this.typesenseConfig.collection,
          q: query,
          facet_by: "tags",
          filter_by: filter_by,
          max_facet_values: 100,
          page: page,
          per_page: per_page,
          ...rest
        }]
      };
      const response = await axios.post(`${this.typesenseConfig.url}/multi_search`, params, {
        headers: {
          ...this.defaultHeaders,
          "content-type": "text/plain",
          "x-typesense-api-key": this.typesenseConfig.apiKey
        }
      });
      console.log(`Search successful. Found ${response.data.results?.[0]?.hits?.length || 0} results`);
      return response.data;
    } catch (error) {
      console.error("Search error:", error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    char_id = "643d10f0-6c08-482e-ba47-9bbb1c5de0df",
    language = "en",
    inference_model = "default",
    max_new_tokens = null,
    temperature = null,
    top_p = null,
    top_k = null,
    autopilot = false,
    continue_chat = false,
    conversation_id = null,
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      if (!char_id) throw new Error("Character ID is required");
      console.log(`Sending chat message to character ${char_id}: "${prompt.substring(0, 20)}${prompt.length > 20 ? "..." : ""}"`);
      const payload = {
        conversation_id: conversation_id,
        character_id: char_id,
        language: language,
        inference_model: inference_model,
        inference_settings: {
          max_new_tokens: max_new_tokens,
          temperature: temperature,
          top_p: top_p,
          top_k: top_k,
          ...rest.inference_settings
        },
        autopilot: autopilot,
        continue_chat: continue_chat,
        message: prompt,
        ...rest
      };
      const response = await this.axiosInstance.post("/chat", payload, {
        headers: {
          ...this.defaultHeaders,
          "content-type": "application/json"
        }
      });
      console.log("Chat response received");
      return response.data;
    } catch (error) {
      console.error("Chat error:", error.message);
      throw error;
    }
  }
  async character({
    id,
    api_version = "v2",
    ...rest
  }) {
    try {
      if (!id) throw new Error("Character ID is required");
      console.log("Fetching character details for:", id);
      const response = await this.axiosInstance.get(`/${api_version}/characters/${id}`, {
        params: rest
      });
      console.log(`Character details fetched: ${response.data?.name || "Unknown"}`);
      return response.data;
    } catch (error) {
      console.error("Character fetch error:", error.message);
      throw error;
    }
  }
  async getApplicationInfo({
    app_id = "pixelchat",
    api_version = "v2",
    ...rest
  }) {
    try {
      console.log("Fetching application info for:", app_id);
      const response = await this.axiosInstance.get(`/${api_version}/applications/${app_id}`, {
        params: rest
      });
      console.log("Application info fetched successfully");
      return response.data;
    } catch (error) {
      console.error("Application info fetch error:", error.message);
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
        action: "search | chat | character"
      }
    });
  }
  const pixelChatApi = new PixelChatApi();
  try {
    let result;
    switch (action) {
      case "search":
        result = await pixelChatApi.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await pixelChatApi.chat(params);
        break;
      case "character":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await pixelChatApi.character(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | chat | character`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API processing error:", error);
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}