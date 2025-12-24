import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class Polybuzz {
  constructor() {
    this.baseUrl = "https://api.polybuzz.ai/api";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      Accept: "application/json",
      "Accept-Language": "id-ID,id;q=0.9",
      "Content-Type": "application/json",
      Origin: "https://www.polybuzz.ai",
      Referer: "https://www.polybuzz.ai/",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "X-LanguageID": "5",
      "X-Localtimezone": "Asia/Makassar",
      CUID: "tourist_4e709b59-d540-45fe-8feb-64d1090df36f-167165"
    };
  }
  async search(params) {
    const {
      query,
      limit = 10,
      expGroupId = "2",
      pageNo = 1,
      pageSize = 20
    } = params;
    const url = `${this.baseUrl}/scene/search`;
    try {
      const response = await this.client.post(url, {
        query: query,
        limit: limit,
        expGroupId: expGroupId,
        pageNo: pageNo,
        pageSize: pageSize
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Search request failed: ${error.message}`);
    }
  }
  async chat(params) {
    const {
      secretSceneId = "v8pDd",
        speechText = "Hello",
        mediaType = 2,
        needLive2D = 0,
        msgList = [],
        currentChatStyleId = 1,
        restrictionType = 1
    } = params;
    const url = `${this.baseUrl}/conversation/msgbystreamasguest`;
    try {
      const response = await this.client.post(url, {
        secretSceneId: secretSceneId,
        mediaType: mediaType,
        speechText: speechText,
        needLive2D: needLive2D,
        msgList: msgList,
        currentChatStyleId: currentChatStyleId,
        restrictionType: restrictionType
      }, {
        headers: this.headers
      });
      return response.data.split("\n").filter(v => v.startsWith("{")).map(v => JSON.parse(v)?.content).join("") || null;
    } catch (error) {
      throw new Error(`Chat request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    ...params
  } = req.body;
  const polybuzz = new Polybuzz();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Missing required parameter: query"
          });
        }
        result = await polybuzz.search(params);
        break;
      case "chat":
        if (!prompt) {
          return res.status(400).json({
            error: "Missing required parameters: prompt"
          });
        }
        params.speechText = prompt || params.speechText;
        result = await polybuzz.chat(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}