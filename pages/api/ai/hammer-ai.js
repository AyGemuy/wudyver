import axios from "axios";
class HammerAIAPI {
  constructor() {
    this.baseURL = "https://www.hammerai.com";
    this.instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://www.hammerai.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.hammerai.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.headers = this.instance.defaults.headers;
  }
  async search({
    query = "",
    page = 1,
    sort = "upvotes",
    safe = "safe",
    tag = "",
    ex_tag = ""
  }) {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("sortBy", sort);
    params.append("safety", safe);
    params.append("tags", tag);
    params.append("excludedTags", ex_tag);
    params.append("search", query);
    const config = {
      headers: this.headers,
      data: JSON.stringify({
        favoriteCharacterIds: []
      })
    };
    try {
      console.log("Mencari karakter...");
      const response = await this.instance.post(`/api/characters?${params.toString()}`, config.data, config);
      console.log("Pencarian karakter berhasil.");
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mencari karakter:", error);
      throw error;
    }
  }
  async chat({
    prompt = "",
    messages = [],
    model = "vllm-FallenMerick/Smart-Lemon-Cookie-7B",
    char_id = "79a1d254-2298-4758-987d-73734314f701",
    temperature = .8,
    top_k = 30,
    top_p = .9,
    n_predict = 256,
    context = 4096,
    penalty = 1.1,
    mlock = true,
    author_id = "73520fce-7859-406b-8925-f19e1bd7f9ab"
  }) {
    const data = {
      authorId: author_id,
      licenseKey: "",
      generateChat: {
        quantizationKey: model,
        messages: messages.length ? messages : [{
          role: "user",
          content: prompt
        }],
        temperature: temperature,
        topP: top_p,
        topK: top_k,
        nPredict: n_predict,
        repetitionPenalty: penalty,
        contextSize: context,
        mlock: mlock,
        characterId: char_id
      }
    };
    const config = {
      headers: this.headers
    };
    try {
      console.log("Memulai chat...");
      const response = await this.instance.post("/api/cloud/chat", JSON.stringify(data), config);
      console.log("Chat berhasil.");
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat melakukan chat:", error);
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
        action: "chat | search"
      }
    });
  }
  const hammer = new HammerAIAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await hammer[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await hammer[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | search`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}