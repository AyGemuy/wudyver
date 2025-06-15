import fetch from "node-fetch";
class AliceApi {
  constructor(baseURL = "https://prod.aliceprj.com/api/ms/v1/alice") {
    this.baseURL = baseURL;
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    this.deviceInfo = {
      "device-id": this.genId(),
      platform: "web",
      version: "2.1.0",
      model: "pc"
    };
    this.userId = null;
    this.token = null;
    this.defaultSearchConfig = {
      loc: "ID",
      lang: "en",
      page_size: "20",
      order_by: "5"
    };
  }
  genId() {
    const h = "0123456789abcdef";
    let u = "";
    for (let i = 0; i < 36; i++) {
      if ([8, 13, 18, 23].includes(i)) u += "-";
      else if (i === 14) u += "4";
      else if (i === 19) u += h[8 + Math.floor(Math.random() * 4)];
      else u += h[Math.floor(Math.random() * 16)];
    }
    return u;
  }
  async request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[AliceApi] Request failed with status ${response.status} for URL: ${url}`, errorBody);
        throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
      }
      const text = await response.text();
      console.log(`[AliceApi] Response from ${url}:`, text);
      return text;
    } catch (error) {
      console.error(`[AliceApi] Error during request to ${url}`, error);
      throw error;
    }
  }
  async getToken() {
    try {
      const params = new URLSearchParams(this.deviceInfo).toString();
      const body = JSON.stringify({
        login_type: 99
      });
      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://alice-ai.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://alice-ai.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": this.userAgent
      };
      const responseData = await this.request(`${this.baseURL}/login?${params}`, {
        method: "POST",
        headers: headers,
        body: body
      });
      const parsedResponse = JSON.parse(responseData);
      if (parsedResponse && parsedResponse.data) {
        this.userId = parsedResponse.data.user_id;
        this.token = parsedResponse.data.jwt_token.access_token;
        return parsedResponse;
      } else {
        throw new Error("Invalid login response structure");
      }
    } catch (error) {
      throw error;
    }
  }
  async search({
    query = "",
    page = 1,
    limit = this.defaultSearchConfig.page_size,
    order = this.defaultSearchConfig.order_by
  }) {
    try {
      if (!this.token) {
        await this.getToken();
      }
      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: `Bearer ${this.token}`,
        origin: "https://alice-ai.com",
        referer: "https://alice-ai.com/",
        "user-agent": this.userAgent,
        "x-timestamp": Date.now().toString()
      };
      const params = new URLSearchParams({
        ...this.deviceInfo,
        "user-id": this.userId,
        loc: this.defaultSearchConfig.loc,
        lang: this.defaultSearchConfig.lang,
        keywords: query,
        page: page.toString(),
        page_size: limit.toString(),
        order_by: order.toString()
      }).toString();
      const responseData = await this.request(`${this.baseURL}/community/chatbots/search?${params}`, {
        method: "GET",
        headers: headers
      });
      const parsedResponse = JSON.parse(responseData);
      return parsedResponse;
    } catch (error) {
      throw error;
    }
  }
  async chat({
    char_id = "384528684003999744",
    prompt = ""
  }) {
    try {
      if (!this.token) {
        await this.getToken();
      }
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
        origin: "https://alice-ai.com",
        pragma: "no-cache",
        referer: "https://alice-ai.com/",
        "user-agent": this.userAgent,
        "x-timestamp": Date.now().toString()
      };
      const params = new URLSearchParams({
        ...this.deviceInfo,
        "user-id": this.userId,
        loc: "ID",
        lang: "en"
      }).toString();
      const body = JSON.stringify({
        metadata_info: {
          source_page: "h5_robot_character",
          source_tab: ""
        },
        msg_type: 4,
        chunk_type: 3,
        message_sequence_id: Date.now().toString(),
        is_community: true,
        chatbot_id: char_id,
        text: prompt,
        photo_url: "",
        auto_play: false,
        source_page: "h5_robot_character"
      });
      const responseData = await this.request(`${this.baseURL}/streaming/message?${params}`, {
        method: "POST",
        headers: headers,
        body: body
      });
      const processedData = this.processChatResponse(responseData);
      return processedData;
    } catch (error) {
      throw error;
    }
  }
  processChatResponse(responseString) {
    const lines = responseString.trim().split("\n");
    let result = {
      result: null,
      array: []
    };
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const dataJson = line.substring(5);
          const data = JSON.parse(dataJson);
          if (data?.data?.chunk_type === 62) {
            result.result = data.data.text;
          } else if (data?.data?.chunk_type === 3) {
            result.array.push(data.data.text);
          }
        } catch (parseError) {}
      }
    }
    result.array = result.array.filter(Boolean);
    return result;
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
        action: "search | chat"
      }
    });
  }
  const alice = new AliceApi();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await alice[action](params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await alice[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | chat`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}