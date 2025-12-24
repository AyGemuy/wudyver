import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class PixuAI {
  constructor() {
    this.baseUrl = "https://pixu.ai";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "id-ID",
      Connection: "keep-alive",
      Origin: "https://pixu.ai",
      Referer: "https://pixu.ai/pixu/creator/image",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      ...SpoofHead()
    };
  }
  async init() {
    try {
      console.log("[INIT] Memulai inisialisasi session...");
      await this.client.get(`${this.baseUrl}/pixu/creator/image`, {
        headers: this.headers
      });
      console.log("[INIT] Session berhasil diinisialisasi");
      return true;
    } catch (error) {
      console.error("[INIT ERROR]", error?.message || error);
      throw error;
    }
  }
  async uploadImage(imageInput) {
    try {
      console.log("[UPLOAD] Mempersiapkan upload gambar...");
      let buffer;
      if (Buffer.isBuffer(imageInput)) {
        buffer = imageInput;
      } else if (typeof imageInput === "string") {
        if (imageInput.startsWith("data:")) {
          const base64Data = imageInput.split(",")[1] || imageInput;
          buffer = Buffer.from(base64Data, "base64");
        } else if (imageInput.startsWith("http")) {
          console.log("[UPLOAD] Mengunduh gambar dari URL...");
          const {
            data
          } = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(data);
        } else {
          buffer = Buffer.from(imageInput, "base64");
        }
      } else {
        throw new Error("Format imageUrl tidak valid");
      }
      const form = new FormData();
      form.append("file[0]", buffer, {
        filename: `${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      console.log("[UPLOAD] Mengirim gambar ke server...");
      const {
        data
      } = await this.client.post(`${this.baseUrl}/pixu/creator/image/-/upload_file/async/renderers=auto`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const $ = cheerio.load(data?.left_content || "");
      const uploadUid = $("#upload_uid").val() || $("#upload_uids_list").val() || $('input[id*="upload_uid"]').first().val();
      if (!uploadUid) {
        if (data?.upload_uid) return data.upload_uid;
        throw new Error("Gagal mendapatkan upload_uid dari response");
      }
      console.log("[UPLOAD] Upload berhasil, upload_uid:", uploadUid);
      return uploadUid;
    } catch (error) {
      console.error("[UPLOAD ERROR]", error?.message || error);
      throw error;
    }
  }
  async createTask(prompt, uploadUid, options = {}) {
    try {
      console.log("[TASK] Membuat task Image-to-Image...");
      if (!uploadUid) {
        throw new Error("Upload UID diperlukan untuk Image-to-Image");
      }
      const jsonData = {
        useface: 0,
        model: options.model || "illustrious_comics",
        creation_type: "reference",
        face_uids: "no_face",
        resolution: options.resolution || "auto",
        face_algorithm: "auto",
        batch_size: String(options.batchSize || options.batch_size || 2),
        prompt_positive: "",
        prompt_negative: "",
        comp_uids: "",
        upload_uids_list: uploadUid,
        source_request_uid: "",
        ref_strength: options.ref_strength || "2",
        sp_uid: ""
      };
      const formData = new URLSearchParams();
      formData.append("json_unstructured_data", JSON.stringify(jsonData));
      console.log("[TASK] Mengirim request create task...");
      const {
        data
      } = await this.client.post(`${this.baseUrl}/pixu/creator/image/-/create_image/null/async/renderers=auto`, formData.toString(), {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      if (data && (data.modal || data.status === "success")) {
        console.log("[TASK] Task berhasil dikirim ke antrian.");
        return true;
      } else {
        console.error("[TASK DEBUG]", data);
        throw new Error("Gagal membuat task, respon server tidak valid.");
      }
    } catch (error) {
      console.error("[TASK ERROR]", error?.message || error);
      throw error;
    }
  }
  async pollTask(lastTs, maxAttempts = 60) {
    try {
      console.log("[POLL] Memulai polling task...");
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        console.log(`[POLL] Check update ${i + 1}/${maxAttempts} (TS: ${lastTs})...`);
        const formData = new URLSearchParams();
        formData.append("json_unstructured_data", "");
        const {
          data
        } = await this.client.post(`${this.baseUrl}/pixu/creator/image/-/check_for_update/${lastTs}/async/renderers=auto`, formData.toString(), {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
          }
        });
        if (data?.timestamp) {
          lastTs = Math.floor(data.timestamp);
        }
        if (data?.right_content_incremental) {
          const $ = cheerio.load(data.right_content_incremental);
          const $items = $(".preview_item");
          if ($items.length > 0) {
            console.log(`[POLL] Ditemukan ${$items.length} item baru!`);
            const results = [];
            $items.each((i, el) => {
              const $img = $(el).find("img");
              let imgSrc = $img.attr("src");
              if (imgSrc) {
                if (imgSrc.startsWith("/")) {
                  imgSrc = `${this.baseUrl}${imgSrc}`;
                }
                results.push(imgSrc);
              }
            });
            if (results.length > 0) {
              console.log("[POLL] Task selesai, hasil ditemukan.");
              return results;
            }
          }
          const statusText = $.text();
          if (statusText.includes("queue") || statusText.includes("Processing")) {
            console.log("[POLL] Masih dalam antrian/proses...");
            continue;
          }
        }
      }
      throw new Error("Timeout: Task terlalu lama, tidak ada hasil.");
    } catch (error) {
      console.error("[POLL ERROR]", error?.message || error);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[GENERATE] Memulai proses Image-to-Image...");
      const imageUrls = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      if (imageUrls.length === 0) {
        throw new Error("Image URL/Buffer wajib diisi untuk mode Image-to-Image.");
      }
      await this.init();
      const allResults = [];
      const lastTs = Math.floor(Date.now() / 1e3) - 10;
      for (const [index, url] of imageUrls.entries()) {
        console.log(`[GENERATE] Processing image ${index + 1}/${imageUrls.length}...`);
        const uploadUid = await this.uploadImage(url);
        await this.createTask(prompt, uploadUid, rest);
        const results = await this.pollTask(lastTs);
        allResults.push(...results);
      }
      console.log(`[GENERATE] Berhasil! Total hasil: ${allResults.length}`);
      return {
        success: true,
        results: allResults,
        mode: "image-to-image",
        total: allResults.length
      };
    } catch (error) {
      console.error("[GENERATE ERROR]", error?.message || error);
      return {
        success: false,
        error: error?.message || "Terjadi kesalahan",
        results: []
      };
    }
  }
  async search({
    query,
    page = 1
  }) {
    try {
      console.log(`[SEARCH] Mencari: "${query}"...`);
      await this.init();
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/pixu/rf_stock_photos/-/${encodedQuery}/${page}/async/renderers=content,js`;
      const {
        data
      } = await this.client.get(url, {
        headers: {
          ...this.headers,
          Referer: `${this.baseUrl}/pixu/rf_stock_photos/-/${encodedQuery}/${page}`
        }
      });
      const htmlContent = data.content || "";
      const startToken = "var json_img_db_data = JSON.parse('";
      const endToken = "');";
      const startIdx = htmlContent.indexOf(startToken);
      if (startIdx === -1) {
        console.log("[SEARCH] Data tidak ditemukan.");
        return {
          success: true,
          results: []
        };
      }
      const contentStart = startIdx + startToken.length;
      const endIdx = htmlContent.indexOf(endToken, contentStart);
      if (endIdx === -1) {
        return {
          success: true,
          results: []
        };
      }
      const rawString = htmlContent.substring(contentStart, endIdx);
      const rawItems = rawString.split("},{");
      const results = [];
      for (let itemStr of rawItems) {
        const getValue = key => {
          const keyStr = `\\"${key}\\":\\"`;
          const keyPos = itemStr.indexOf(keyStr);
          if (keyPos === -1) return null;
          const valStart = keyPos + keyStr.length;
          const valEnd = itemStr.indexOf(`\\"`, valStart);
          if (valEnd === -1) return null;
          return itemStr.substring(valStart, valEnd);
        };
        const cleanText = str => (str || "").split('\\"').join('"').split("\\/").join("/");
        const id = getValue("sp_uid");
        if (id) {
          const prefix = id.substring(0, 2);
          const folder = `__${prefix}`;
          const imgBase = `${this.baseUrl}/pixu/images/stock/${folder}`;
          results.push({
            id: id,
            title: cleanText(getValue("title")) || "No Title",
            description: cleanText(getValue("descr")),
            keywords: cleanText(getValue("keywords_txt")),
            preview_url: `${imgBase}/preview_${id}.jpg`,
            thumb_url: `${imgBase}/thumb_${id}.jpg`,
            full_url: `${imgBase}/${id}.jpg`,
            width: getValue("w"),
            height: getValue("h"),
            views: getValue("views"),
            downloads: getValue("downloads")
          });
        }
      }
      console.log(`[SEARCH] Ditemukan ${results.length} hasil.`);
      return {
        success: true,
        results: results
      };
    } catch (error) {
      console.error("[SEARCH ERROR]", error?.message);
      return {
        success: false,
        error: error?.message
      };
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new PixuAI();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'generate'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}