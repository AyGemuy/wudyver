import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import crypto from "crypto";
class PhoTo {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      timeout: 4e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://funny.pho.to",
        Referer: "https://funny.pho.to/"
      }
    }));
    this.app_id = "8BDD0A61779556B1F9F817CCA583";
    this.api_key = "2AC9CD8593D6ED7940C829E19DC3";
  }
  async _buf(input) {
    try {
      console.log("[log] Memproses input gambar...");
      if (typeof input === "string" && input.startsWith("http")) {
        console.log("[log] Mengonversi gambar via wsrv.nl ke JPEG...");
        const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(input)}&output=jpg&q=80`;
        const res = await axios.get(wsrvUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (Buffer.isBuffer(input)) return input;
      return Buffer.from(input?.includes(",") ? input.split(",")[1] : input, "base64");
    } catch (e) {
      throw new Error("Gagal proses/konversi via wsrv: " + e.message);
    }
  }
  async _up(buf) {
    try {
      console.log("[log] Mengunggah gambar ke Pho.to temp server...");
      const form = new FormData();
      form.append("image", buf, {
        filename: "input.jpg",
        contentType: "image/jpeg"
      });
      form.append("gen_preview", "1");
      form.append("r", Math.floor(Math.random() * 1e7).toString());
      form.append("resizeWidth", "1200");
      const {
        data
      } = await this.api.post("https://temp.ws.pho.to/upload.php", form, {
        headers: {
          ...form.getHeaders(),
          Accept: "*/*"
        }
      });
      const tempUrl = data?.trim();
      if (!tempUrl || !tempUrl.startsWith("http")) {
        throw new Error(`Upload gagal. Response server: ${data}`);
      }
      return tempUrl;
    } catch (e) {
      throw new Error("Tahap Upload: " + e.message);
    }
  }
  async _que(tempUrl, p) {
    try {
      console.log("[log] Menyiapkan antrian proses (Queue)...");
      const text1 = p.header ? Buffer.from(p.header).toString("base64") : "";
      const text2 = p.name ? Buffer.from(p.name).toString("base64") : "";
      let methodParams = `template_name=${p.template || "wanted"}`;
      if (text1) methodParams += `;text=${text1}`;
      if (text2) methodParams += `;text2=${text2}`;
      const xmlData = `<image_process_call>` + `<image_url order="1">${tempUrl}</image_url>` + `<methods_list>` + `<method order="1">` + `<name>collage</name>` + `<params>${methodParams}</params>` + `</method>` + `</methods_list>` + `<result_size>${p.size || 1400}</result_size>` + `<result_quality>90</result_quality>` + `<template_watermark>${p.watermark ? "true" : "false"}</template_watermark>` + `<lang>en</lang>` + `<abort_methods_chain_on_error>true</abort_methods_chain_on_error>` + `</image_process_call>`;
      const signData = crypto.createHmac("sha1", this.api_key).update(xmlData).digest("hex");
      const body = new URLSearchParams({
        app_id: this.app_id,
        data: xmlData,
        sign_data: signData
      });
      const {
        data
      } = await this.api.post("https://opeapi.ws.pho.to/queue_url.php?service_id=7", body.toString());
      const $ = cheerio.load(data, {
        xmlMode: true
      });
      const requestId = $("request_id").text();
      if (!requestId) throw new Error("Gagal mendapatkan Request ID. Response: " + data);
      return requestId;
    } catch (e) {
      throw new Error("Tahap Queue: " + e.message);
    }
  }
  async _res(reqId) {
    try {
      const {
        data
      } = await this.api.get(`https://opeapi.ws.pho.to/get-result.php?request_id=${reqId}&_=${Date.now()}`);
      const $ = cheerio.load(data, {
        xmlMode: true
      });
      const status = $("status").text();
      const resultUrl = $("result_url").text();
      if (status === "InProgress" || status === "Queued") {
        await new Promise(r => setTimeout(r, 3e3));
        return await this._res(reqId);
      }
      if (status === "Error") throw new Error($("description").text() || "Render Error");
      return resultUrl || null;
    } catch (e) {
      throw new Error("Tahap Result: " + e.message);
    }
  }
  async generate(params) {
    try {
      const buf = await this._buf(params.imageUrl);
      const tempUrl = await this._up(buf);
      const requestId = await this._que(tempUrl, params);
      const finalResult = await this._res(requestId);
      return {
        success: true,
        result: finalResult
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
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new PhoTo();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}