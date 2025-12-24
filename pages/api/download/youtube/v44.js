import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class TubeRipper {
  constructor({
    debug = true
  }) {
    this.baseUrl = "https://tuberipper.com";
    this.regexToken = /<input\s?id\=["']videoToken['"]\s?type\=['"]hidden["']\s?name\=['"]token['"]\s?value\=['"](\w+)['"]>/i;
    this.debug = debug;
    this.token = null;
    this.redirectUrl = null;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      Referer: "https://tuberipper.com/33/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }
  async axiosRequest(data) {
    data.headers = this.headers;
    const response = await axios(data);
    return response;
  }
  async getDirectLink() {
    if (this.debug) {
      console.log("[ LOG ] Mendapatkan link redirect...");
    }
    try {
      const response = await this.axiosRequest({
        url: this.baseUrl,
        method: "HEAD",
        maxRedirects: 0,
        validateStatus: status => status < 500
      });
      this.redirectUrl = response.headers["location"];
      const responseCookie = await this.axiosRequest({
        url: this.redirectUrl,
        method: "HEAD",
        maxRedirects: 0,
        validateStatus: status => status < 500
      });
      this.headers["cookie"] = responseCookie.headers["set-cookie"][0];
      return {
        ok: true,
        message: "sukses mendapatkan link asli.",
        result: response.headers["location"]
      };
    } catch (error) {
      return {
        ok: false,
        at: "getDirectLink",
        message: error.toString()
      };
    }
  }
  async getToken() {
    try {
      const tokens = await this.getDirectLink();
      if (!tokens.ok) {
        return tokens;
      }
      if (this.debug) {
        console.log("[ LOG ] Mendapatkan token video...");
      }
      const response = await this.axiosRequest({
        url: this.redirectUrl,
        method: "GET"
      });
      const mat = response.data.match(this.regexToken);
      if (mat) {
        this.token = mat[1];
        return {
          ok: true,
          message: "Sukses mendapatkan token",
          result: mat[1]
        };
      } else {
        return {
          ok: false,
          message: "Gagal mendapatkan token"
        };
      }
    } catch (error) {
      return {
        ok: false,
        at: "getToken",
        message: error.toString()
      };
    }
  }
  async generateSignature(payload) {
    global.document = {
      innerHTML: () => {},
      currentScript: {
        remove: () => {}
      }
    };
    global.atob = str => Buffer.from(str, "base64").toString("utf-8");
    global.btoa = str => Buffer.from(str, "utf-8").toString("base64");
    return new Promise(resolve => {
      const __tr_app_cb = data => {
        resolve(data);
      };
      const dec = Buffer.from(payload, "base64").toString("utf-8");
      const repl = dec.replace("{callback}", "__tr_app_cb").replace(/window/g, "global");
      eval(repl);
    });
  }
  async getEntry(link) {
    try {
      const ttkn = await this.getToken();
      if (!ttkn.ok) {
        return ttkn;
      }
      const data = new FormData();
      data.append("url", link);
      data.append("token", ttkn.result);
      this.headers["content-type"] = "application/x-www-form-urlencoded";
      const response = await this.axiosRequest({
        url: `${this.baseUrl}/entry`,
        method: "POST",
        data: data
      });
      if (response.data.status == "error") {
        return {
          ok: false,
          message: response.data.message
        };
      }
      return {
        ok: true,
        message: "Sukses mendapatkan entry payload",
        result: response.data
      };
    } catch (error) {
      return {
        ok: false,
        at: "getEntry",
        message: error.toString()
      };
    }
  }
  async getInfo(link) {
    try {
      const payload = await this.getEntry(link);
      if (!payload.ok) {
        return payload;
      }
      if (this.debug) {
        console.log("[ LOG ] Mendapatkan payload info...");
      }
      const tokenSign = await this.generateSignature(payload.result.message.payload);
      const data = new FormData();
      data.append("payload", tokenSign);
      this.headers["content-type"] = "application/x-www-form-urlencoded";
      this.headers["Referer"] = "https://tuberipper.com/";
      this.headers["origin"] = "https://tuberipper.com";
      delete this.headers["cookie"];
      const response = await this.axiosRequest({
        url: payload.result.message.url,
        method: "POST",
        data: data
      });
      if (response.data.status == "error") {
        return {
          ok: false,
          message: response.data.message
        };
      }
      return {
        ok: true,
        message: "Sukses mendapatkan info video",
        result: response.data
      };
    } catch (error) {
      return {
        ok: false,
        at: "getInfo",
        message: error.toString()
      };
    }
  }
  async getDownload({
    url: link
  }) {
    try {
      const yt = await this.getInfo(link);
      const data = yt.result.message;
      const $ = cheerio.load(data);
      return {
        title: $("h2.text-center").text() || "No Title",
        video: $(".col-sm-6.text-right.text-center-xs a.list-image-playable").attr("href") || "No Video Link",
        image: $(".col-sm-6.text-right.text-center-xs a.list-image-playable img").attr("src") || "No Image",
        duration: $(".col-sm-6.text-right.text-center-xs .duration").text() || "No Duration",
        download: $(".btn-group .js-download").get().map(el => ({
          format: $(el).text(),
          url: $(el).attr("href")
        })) || "No Downloads"
      };
    } catch (error) {
      return {
        ok: false,
        at: "Info",
        message: error.toString()
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const tubeRipper = new TubeRipper({
      debug: params.debug
    });
    const result = await tubeRipper.getDownload(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}