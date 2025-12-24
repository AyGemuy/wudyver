import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
class Ephoto360 {
  constructor() {
    this.cookieJar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.baseUrl = "https://en.ephoto360.com";
  }
  async generate(url, texts = []) {
    try {
      const {
        data
      } = await this.axios.get(url);
      const $ = cheerio.load(data);
      const formData = new URLSearchParams();
      $("input[name='text[]']").each((i, el) => {
        formData.append("text[]", texts[i] || $(el).attr("placeholder") || "");
      });
      ["token", "build_server", "build_server_id"].forEach(name => formData.append(name, $(`input[name="${name}"]`).val() || ""));
      formData.append("file_image_input", "");
      formData.append("submit", "GO");
      const {
        data: postRes
      } = await this.axios.post(url, formData);
      const $post = cheerio.load(postRes);
      const formValueInput = $post("#form_value_input").attr("value");
      if (!formValueInput) throw new Error("Gagal mengambil form_value_input");
      const {
        id,
        token,
        build_server,
        build_server_id
      } = JSON.parse(formValueInput.replace(/&quot;/g, '"'));
      if (!id || !token || !build_server) throw new Error("Data tidak lengkap untuk pembuatan gambar");
      const finalData = new URLSearchParams({
        id: id,
        token: token,
        build_server: build_server,
        build_server_id: build_server_id
      });
      $("input[name='text[]']").each((i, el) => {
        finalData.append("text[]", texts[i] || $(el).attr("placeholder") || "");
      });
      const {
        data: result
      } = await this.axios.post(`${this.baseUrl}/effect/create-image`, finalData);
      if (!result.success) throw new Error("Pembuatan gambar gagal");
      return {
        success: true,
        image: `${build_server}${result.image}`
      };
    } catch (err) {
      return {
        success: false,
        message: err.message
      };
    }
  }
  async search(query) {
    try {
      const {
        data
      } = await this.axios.get(`${this.baseUrl}/index/search?q=${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      const results = [];
      $(".row .col-md-4").each((_, el) => {
        const $el = $(el);
        const link = $el.find("a").attr("href");
        const title = $el.find(".title-effect-home").text().trim();
        const img = $el.find("img").attr("src");
        if (link && title && img) {
          results.push({
            title: title,
            url: `${this.baseUrl}${link}`,
            image: `${this.baseUrl}${img}`
          });
        }
      });
      return results.length ? {
        success: true,
        results: results
      } : {
        success: false,
        message: "Tidak ada hasil ditemukan"
      };
    } catch (err) {
      return {
        success: false,
        message: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    url,
    query,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const ephoto = new Ephoto360();
  const supportedActions = ["search", "create"];
  try {
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            success: false,
            message: "Paramenter 'query' diperlukan untuk pencarian"
          });
        }
        const searchResults = await ephoto.search(query);
        return res.status(200).json(searchResults);
      case "create":
        if (!url || typeof url !== "string" || !url.startsWith("https://")) {
          return res.status(400).json({
            success: false,
            message: "Paramenter 'url' tidak valid atau tidak diberikan"
          });
        }
        let textInput = [];
        if (params.text) {
          if (typeof params.text === "string" && params.text.trim()) {
            textInput = [params.text.trim()];
          } else if (Array.isArray(params.text)) {
            textInput = params.text.map(t => t.trim()).filter(t => t);
          }
        }
        const textEntries = Object.fromEntries(Object.entries(params).filter(([k]) => k.startsWith("text")));
        const textFromEntries = Object.values(textEntries).filter(t => typeof t === "string" && t.trim());
        textInput = textFromEntries.length > 0 ? textFromEntries : textInput;
        if (textInput.length === 0) {
          return res.status(400).json({
            success: false,
            message: "At least one non-empty 'text' parameter (single, multi, or entries) is required for action 'create'"
          });
        }
        const result = await ephoto.generate(url, textInput);
        return res.status(200).json(result);
      default:
        return res.status(400).json({
          success: false,
          message: `Paramenter 'action' tidak valid. Supported actions: ${supportedActions.join(", ")}`
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error occurred"
    });
  }
}