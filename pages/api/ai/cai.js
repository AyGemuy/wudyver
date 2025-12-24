import {
  CAINode
} from "cainode";
import axios from "axios";
class CharacterInteraction {
  constructor(apiKeys = ["719495ca07ae0bdd93407d1239b36c5ef2b66523", "2f6574d242aef84fda8466d6e4387592674cb084", "97f9aaaebf33d4944dc7c6d3dee20eaf42948e4a"]) {
    this.apiKeys = apiKeys;
    this.client = new CAINode();
    this.searchResults = null;
    this.chatResponse = null;
    this.imageResponse = null;
    this.isLoggedIn = false;
    this.searchApiUrl = "https://character.ai/api/trpc/search.search";
    this.searchHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://character.ai/search",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async _login() {
    if (this.isLoggedIn) {
      return;
    }
    const randomIndex = Math.floor(Math.random() * this.apiKeys.length);
    const apiKey = this.apiKeys[randomIndex];
    try {
      await this.client.login(apiKey);
      this.isLoggedIn = true;
      console.log("Logged in!");
    } catch (error) {
      console.error("Error saat login:", error);
      this.isLoggedIn = false;
      throw error;
    }
  }
  async _logout() {
    if (this.isLoggedIn) {
      try {
        await this.client.logout();
        this.isLoggedIn = false;
        console.log("Logged out.");
      } catch (error) {
        console.error("Error saat logout:", error);
      }
    }
  }
  async search({
    query = "yuri"
  }) {
    try {
      const searchPayload = {
        batch: 1,
        input: {
          0: {
            json: {
              searchQuery: query,
              tagId: null,
              sortedBy: "relevance"
            },
            meta: {
              values: {
                tagId: ["undefined"]
              }
            }
          }
        }
      };
      let queryString = `batch=${encodeURIComponent(searchPayload.batch)}`;
      queryString += `&input=${encodeURIComponent(JSON.stringify(searchPayload.input))}`;
      const url = `${this.searchApiUrl}?${queryString}`;
      const response = await axios.get(url, {
        headers: this.searchHeaders
      });
      this.searchResults = response.data?.[0]?.result?.data?.json;
      return this.searchResults;
    } catch (error) {
      console.error("Error saat pencarian:", error);
      throw error;
    }
  }
  async chat({
    char_id: characterId = "7IA8Bw3NsyjruZH-8gLLKqzo3UdZ_2QBvqrCBlS0__U",
    prompt = "A beautiful sunset"
  }) {
    try {
      await this._login();
      await this.client.character.connect(characterId);
      this.chatResponse = await this.client.character.send_message(prompt, false, "");
      await this.client.character.disconnect();
      return this.chatResponse?.turn;
    } finally {
      await this._logout();
    }
  }
  async image({
    prompt = "A beautiful sunset"
  }) {
    try {
      await this._login();
      this.imageResponse = await this.client.image.generate_image(prompt);
      return this.imageResponse;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    } finally {
      await this._logout();
    }
  }
  getSearchResults() {
    return this.searchResults;
  }
  getChatResponse() {
    return this.chatResponse;
  }
  getImageResponse() {
    return this.imageResponse;
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
  const interaction = new CharacterInteraction();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await interaction[action](params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await interaction[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await interaction[action](params);
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