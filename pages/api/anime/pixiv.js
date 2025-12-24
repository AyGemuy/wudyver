import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class Pixiv {
  constructor() {
    this.api = {
      base: "https://www.pixiv.net",
      endpoints: {
        search: "/ajax/search/artworks/",
        illust: "/ajax/illust/"
      },
      proxy: "https://api.xiaomiao-ica.top/agent/index.php"
    };
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      accept: "application/json",
      referer: "https://www.pixiv.net/",
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "XMLHttpRequest"
    };
    this.defaults = {
      useProxy: true,
      useUpload: false,
      useBuffer: false,
      outputType: "url",
      deleteAfterUpload: true,
      cookie: null
    };
    this.orderTypes = {
      date_d: "Terbaru ke Terlama",
      date: "Terlama ke Terbaru",
      popular_d: "Populer Hari Ini",
      popular_male_d: "Populer dari Laki-laki",
      popular_female_d: "Populer dari Perempuan"
    };
  }
  isOrder(order) {
    return Object.keys(this.orderTypes).includes(order);
  }
  getOrder() {
    return Object.entries(this.orderTypes).map(([key, value]) => ({
      type: key,
      description: value
    }));
  }
  isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
  isPix(url) {
    if (!url) return false;
    const patterns = [/^https?:\/\/(?:www\.)?pixiv\.net\/artworks\/\d+/, /^https?:\/\/(?:www\.)?pixiv\.net\/users\/\d+/, /^https?:\/\/(?:www\.)?pixiv\.net\/tags\/.*?\/artworks/, /^https?:\/\/i\.pximg\.net\/img-.*?\/img\/.*?\/\d+_p\d+\.\w+$/];
    return patterns.some(pattern => pattern.test(url.trim().toLowerCase()));
  }
  async getCookies(kukis = null) {
    if (kukis) return kukis;
    try {
      const response = await axios.get(this.api.base);
      const setHeaders = response.headers["set-cookie"];
      return setHeaders ? setHeaders.map(cookieString => cookieString.split(";")[0].trim()).join("; ") : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  proxies(url) {
    return `${this.api.proxy}?dns=8.8.8.8&fileUrl=${encodeURIComponent(url)}&referer=https://www.pixiv.net`;
  }
  async up2Upload(buffer, filename) {
    try {
      const formData = new FormData();
      formData.append("file", buffer, filename);
      const response = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Upload gagal:", error);
      return null;
    }
  }
  async imagesx(url, options = {}) {
    try {
      const opt = {
        ...this.defaults,
        ...options
      };
      const dlink = opt.useProxy ? this.proxies(url) : url;
      const headers = opt.useProxy ? {} : {
        Referer: "https://www.pixiv.net/"
      };
      const response = await axios.get(dlink, {
        responseType: "arraybuffer",
        headers: headers
      });
      const buffer = Buffer.from(response.data);
      const filename = url.split("/").pop();
      const result = {
        original: url,
        mime: response.headers["content-type"],
        size: buffer.length
      };
      if (opt.useProxy) result.proxy = dlink;
      if (opt.useBuffer) result.buffer = buffer;
      if (opt.useUpload) {
        result.upload = await this.up2Upload(buffer, filename);
      }
      return result;
    } catch (error) {
      console.error("Gagal mengambil gambar:", error);
      return {
        error: "Gagal mengambil gambar."
      };
    }
  }
  async search(query, options = {}) {
    if (!query) return {
      status: false,
      code: 400,
      result: {
        error: "Querynya mana bree? 🤨"
      }
    };
    if (options.order && !this.isOrder(options.order)) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Order tidak valid!",
          valid_orders: this.getOrder()
        }
      };
    }
    try {
      const cookies = await this.getCookies(options.cookie);
      if (!cookies) return {
        status: false,
        code: 400,
        result: {
          error: "Kukis tidak tersedia."
        }
      };
      const params = {
        word: query,
        order: options.order || "date_d",
        mode: "all",
        p: options.page || 1,
        s_mode: "s_tag_full",
        type: "all",
        lang: "en"
      };
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoints.search}${encodeURIComponent(query)}`, {
        headers: {
          ...this.headers,
          cookie: cookies
        },
        params: params
      });
      if (!data.body?.illustManga?.data) return {
        status: false,
        code: 404,
        result: {
          error: `Tidak ditemukan hasil untuk "${query}".`
        }
      };
      return {
        status: true,
        code: 200,
        result: data.body.illustManga.data
      };
    } catch (error) {
      console.error(error);
      return {
        status: false,
        code: 500,
        result: {
          error: "Server error."
        }
      };
    }
  }
  async download(url, options = {}) {
    if (!this.isUrl(url) || !this.isPix(url)) {
      return {
        status: false,
        code: 400,
        result: {
          error: "URL tidak valid atau bukan dari Pixiv."
        }
      };
    }
    try {
      const illustId = url.match(/\d+/)[0];
      const cookies = await this.getCookies(options.cookie);
      if (!cookies) return {
        status: false,
        code: 400,
        result: {
          error: "Kukis tidak tersedia."
        }
      };
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoints.illust}${illustId}`, {
        headers: {
          ...this.headers,
          cookie: cookies
        }
      });
      if (!data.body) return {
        status: false,
        code: 404,
        result: {
          error: "Artwork tidak ditemukan."
        }
      };
      const images = await Promise.all([...Array(data.body.pageCount).keys()].map(async i => {
        const imageUrl = data.body.urls.original.replace("_p0", `_p${i}`);
        return await this.imagesx(imageUrl, options);
      }));
      return {
        status: true,
        code: 200,
        result: {
          artwork: {
            id: data.body.illustId,
            title: data.body.illustTitle,
            type: data.body.illustType === 2 ? "ugoira" : data.body.illustType === 1 ? "manga" : "illustration",
            images: images
          },
          artist: {
            id: data.body.userId,
            name: data.body.userName,
            profile_url: `https://www.pixiv.net/users/${data.body.userId}`
          }
        }
      };
    } catch (error) {
      console.error(error);
      return {
        status: false,
        code: 500,
        result: {
          error: "Terjadi kesalahan."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      query,
      url,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const pixiv = new Pixiv();
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query tidak boleh kosong"
        });
        const searchResults = await pixiv.search(query, params);
        return res.status(200).json(searchResults);
      case "download":
        if (!url) return res.status(400).json({
          error: "URL tidak boleh kosong"
        });
        const downloadResult = await pixiv.download(url, params);
        return res.status(200).json(downloadResult);
      default:
        return res.status(400).json({
          error: "Action tidak valid"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}