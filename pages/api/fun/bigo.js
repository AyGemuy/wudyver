import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class BigoClient {
  constructor({
    userAgent,
    mobile = false
  } = {}) {
    this.jar = new CookieJar();
    this.deviceId = `web_${Math.random().toString(36).substr(2)}_${Date.now()}`;
    const defaultUA = mobile ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
    this.client = wrapper(axios.create({
      baseURL: "https://ta.bigo.tv",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json;charset=UTF-8",
        origin: "https://www.bigo.tv",
        referer: "https://www.bigo.tv/",
        dnt: "1",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-ch-ua": mobile ? '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"' : '"Chromium";v="142", "Google Chrome";v="142", "Not=A?Brand";v="99"',
        "sec-ch-ua-mobile": mobile ? "?1" : "?0",
        "sec-ch-ua-platform": mobile ? '"Android"' : '"macOS"',
        "user-agent": userAgent || defaultUA,
        "device-id": this.deviceId
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  async req({
    method = "GET",
    url,
    data,
    params,
    ...rest
  }) {
    try {
      console.log(`📡 ${method} ${url}`);
      const res = await this.client.request({
        method: method,
        url: url,
        data: data,
        params: params,
        ...rest
      });
      console.log(`✅ ${method} ${url} - Status: ${res.status}`);
      return res.data;
    } catch (err) {
      console.error(`❌ ${method} ${url} - Error:`, err.message);
      throw err;
    }
  }
  async getCat() {
    try {
      const data = await this.req({
        url: "/official_website/OInterface/getGameCategory"
      });
      const cats = data?.data || [];
      return cats;
    } catch (err) {
      console.error("Gagal ambil kategori:", err.message);
      return [];
    }
  }
  async getRank() {
    try {
      const data = await this.req({
        url: "/official_website/OInterface/getWeekGetRank"
      });
      const ranks = data?.data || [];
      return ranks;
    } catch (err) {
      console.error("Gagal ambil ranking:", err.message);
      return [];
    }
  }
  async getLive({
    type: tabType = "ID",
    fetchNum = 30,
    ignoreUids = "",
    lang = "id",
    vedioType = 5,
    ...rest
  } = {}) {
    try {
      const params = {
        tabType: tabType,
        fetchNum: fetchNum,
        ignoreUids: ignoreUids,
        lang: lang
      };
      const url = `/official_website/OInterfaceWeb/vedioList/${vedioType}`;
      const data = await this.req({
        url: url,
        params: params,
        ...rest
      });
      const rooms = data?.data || [];
      return rooms;
    } catch (err) {
      console.error("Gagal ambil live:", err.message);
      return [];
    }
  }
  async stalk({
    id: bigoId,
    ...rest
  } = {}) {
    if (!bigoId) {
      console.error("❌ Bigo ID diperlukan");
      return null;
    }
    try {
      const data = await this.req({
        method: "POST",
        url: "/official_website_tiebar/anchor/info",
        data: {
          bigoId: bigoId
        },
        ...rest
      });
      const user = data?.data || {};
      return user;
    } catch (err) {
      console.error("Gagal stalk:", err.message);
      return null;
    }
  }
  async getRegions() {
    try {
      const data = await this.req({
        url: "/official_website/OInterface/getRegionList"
      });
      const regions = data?.data || [];
      return regions;
    } catch (err) {
      console.error("Gagal ambil region:", err.message);
      return [];
    }
  }
  async getBlogTags({
    size = 100,
    cursor = "",
    lang = "id",
    ...rest
  } = {}) {
    try {
      const data = await this.req({
        method: "POST",
        url: "/official_website/api/officialBlog/blog/tags",
        data: {
          size: size,
          cursor: cursor,
          lang: lang
        },
        ...rest
      });
      const tags = data?.data || [];
      return tags;
    } catch (err) {
      console.error("Gagal ambil blog tags:", err.message);
      return [];
    }
  }
  async getPosts({
    count = 4,
    ...rest
  } = {}) {
    try {
      const params = {
        count: count,
        "device-id": this.deviceId
      };
      const data = await this.req({
        url: "/official_website_tiebar/recommend/postList",
        params: params,
        ...rest
      });
      const posts = data?.data || [];
      return posts;
    } catch (err) {
      console.error("Gagal ambil posts:", err.message);
      return [];
    }
  }
  async getUserStudio({
    id: bigoId,
    ...rest
  } = {}) {
    if (!bigoId) {
      console.error("❌ Bigo ID diperlukan");
      return null;
    }
    try {
      const data = await this.req({
        url: "/official_website/OUserCenter/getUserInfoStudio",
        params: {
          bigoId: bigoId
        },
        ...rest
      });
      const studio = data?.data || {};
      return studio;
    } catch (err) {
      console.error("Gagal ambil user studio:", err.message);
      return null;
    }
  }
  async getGifts({
    ...rest
  } = {}) {
    try {
      const data = await this.req({
        method: "POST",
        url: "/official_website/live/giftconfig/getOnlineGifts",
        data: {},
        ...rest
      });
      const gifts = data?.data || [];
      return gifts;
    } catch (err) {
      console.error("Gagal ambil gifts:", err.message);
      return [];
    }
  }
  async getBlogList({
    size = 10,
    cursor = "",
    slugId = "",
    lang = "id",
    slugUrl = "",
    ...rest
  } = {}) {
    try {
      const data = await this.req({
        method: "POST",
        url: "/official_website/api/officialBlog/blog/list",
        data: {
          size: size,
          cursor: cursor,
          slugId: slugId,
          lang: lang,
          slugUrl: slugUrl
        },
        ...rest
      });
      const blogs = data?.data || [];
      return blogs;
    } catch (err) {
      console.error("Gagal ambil blog list:", err.message);
      return [];
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
      error: "Action wajib diisi",
      actions: ["games", "rankings", "live", "stalk", "regions", "blogTags", "posts", "userStudio", "gifts", "blogList"]
    });
  }
  try {
    const api = new BigoClient();
    let result;
    switch (action) {
      case "games":
        result = await api.getCat();
        break;
      case "rankings":
        result = await api.getRank();
        break;
      case "live":
        if (!params.type) {
          return res.status(400).json({
            error: "Parameter 'type' wajib diisi",
            types: ["ID", "ALL", "3k", "69", ""]
          });
        }
        result = await api.getLive(params);
        break;
      case "stalk":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi"
          });
        }
        result = await api.stalk(params);
        break;
      case "regions":
        result = await api.getRegions();
        break;
      case "blogTags":
        result = await api.getBlogTags(params);
        break;
      case "posts":
        result = await api.getPosts(params);
        break;
      case "userStudio":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi"
          });
        }
        result = await api.getUserStudio(params);
        break;
      case "gifts":
        result = await api.getGifts();
        break;
      case "blogList":
        if (!params.id && !params.slugId) {
          return res.status(400).json({
            error: "Parameter 'id' atau 'slugId' wajib diisi"
          });
        }
        result = await api.getBlogList(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          actions: ["games", "rankings", "live", "stalk", "regions", "blogTags", "posts", "userStudio", "gifts", "blogList"]
        });
    }
    return res.status(200).json({
      status: true,
      result: result,
      message: `${action} berhasil diambil`
    });
  } catch (e) {
    console.error(`[BIGO API] ${action}:`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Internal server error"
    });
  }
}