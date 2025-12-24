import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class MakeStickersAPI {
  constructor() {
    this.axiosInstance = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async makeRequest(method, url, data = null) {
    try {
      return (await this.axiosInstance({
        method: method,
        url: url,
        ...data && {
          data: data
        }
      })).data;
    } catch (error) {
      console.error(`Error during ${method.toUpperCase()} request:`, error);
      throw error;
    }
  }
  async search({
    query,
    productId = "40ba4a71b69743a99d157e1b5d13539c",
    page = 1
  }) {
    const url = `https://www.makestickers.com/ssapi/json/reply/GetTemplateListingsRequest?CompatibleWithProductProductOptionId=${productId}&SearchKeyword=${encodeURIComponent(query)}&CategoryId&Page=${page}`;
    return await this.makeRequest("get", url);
  }
  async detail({
    id
  }) {
    return await this.makeRequest("post", `https://www.makestickers.com/ssapi/json/reply/GetCustomzeTemplateDesignItemsRequest`, {
      TemplateId: id
    });
  }
  async create({
    id,
    ...texts
  }) {
    const designItems = (await this.detail({
      id: id
    })).Output.DesignItems;
    const designItemChoices = designItems.map(item => {
      const choice = {
        DesignItemId: item.Id
      };
      const textKey = item.Type.toLowerCase();
      if (texts[textKey]) {
        choice[textKey.charAt(0).toUpperCase() + textKey.slice(1)] = texts[textKey];
      }
      return choice;
    });
    return await this.makeRequest("post", "https://www.makestickers.com/ssapi/json/reply/CustomizeTemplateRequest", {
      TemplateId: id,
      DesignItemChoices: designItemChoices
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.body;
  const api = new MakeStickersAPI();
  try {
    let result;
    switch (action) {
      case "search":
        result = await api.search(params);
        break;
      case "detail":
        result = await api.detail(params);
        break;
      case "create":
        result = await api.create(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API call failed:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}