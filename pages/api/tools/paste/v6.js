import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
class KlipitScraper {
  constructor() {
    this.origin = "https://klipit.in";
    this.cookies = {};
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID,id;q=0.9",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
    this.endpoint = "";
    this.cid = "";
    this.key = "";
  }
  cookieString() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  updateCookies(setCookieHeaders = []) {
    setCookieHeaders.forEach(cookieStr => {
      const parts = cookieStr.split(";")[0].split("=");
      const key = parts[0].trim();
      const val = parts[1]?.trim();
      if (key && val) this.cookies[key] = val;
    });
  }
  async init() {
    try {
      console.log("1. Mengirim request awal ke:", `${this.origin}/new`);
      const res1 = await axios.get(`${this.origin}/new`, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          referer: `${this.origin}`,
          cookie: this.cookieString()
        },
        maxRedirects: 0,
        validateStatus: status => status === 302
      });
      const redirectUrl = res1.headers.location;
      console.log("2. Redirect URL ditemukan:", redirectUrl);
      this.updateCookies(res1.headers["set-cookie"]);
      console.log("3. Cookie dari response awal:", this.cookies);
      if (!redirectUrl.startsWith("/")) throw new Error("Invalid redirect URL");
      console.log("4. Mengirim request ke redirect URL...");
      const res2 = await axios.get(`${this.origin}${redirectUrl}`, {
        headers: {
          ...this.headers,
          referer: `${this.origin}${redirectUrl}`,
          cookie: this.cookieString()
        }
      });
      this.updateCookies(res2.headers["set-cookie"]);
      const html = res2.data;
      const $ = cheerio.load(html);
      const script = $("script").filter((i, el) => $(el).html().includes("var endpoint")).html() || "";
      const endpoint = script.match(/var endpoint = "(.*?)"/)?.[1];
      const cid = script.match(/const cid = "(.*?)"/)?.[1];
      const key = script.match(/const key = "(.*?)"/)?.[1];
      if (!endpoint || !cid || !key) throw new Error("Gagal mengambil data dari script");
      this.endpoint = endpoint;
      this.cid = cid;
      this.key = key;
      console.log("5. Data berhasil diambil:", {
        endpoint: endpoint,
        cid: cid,
        key: key
      });
    } catch (err) {
      console.error("Terjadi error:", err.message);
    }
  }
  async submitData({
    name
  }) {
    try {
      if (!this.endpoint || !this.cid || !this.key) {
        throw new Error("Data belum diinisialisasi. Harap tunggu hingga proses selesai.");
      }
      this.cookies.endpoint = this.endpoint;
      console.log("6. Mengirim data ke ajax_save_data.php...");
      const res = await axios.post(`${this.origin}/ajax_save_data.php`, qs.stringify({
        i: this.cid,
        k: this.key,
        d: name
      }), {
        headers: {
          ...this.headers,
          accept: "*/*",
          origin: this.origin,
          referer: `${this.origin}/${this.endpoint}`,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          cookie: this.cookieString()
        }
      });
      console.log("7. Response dari ajax_save_data.php:", res.data);
      if (res.data == 1) {
        console.log("Berhasil submit data! Informasi:");
        console.log({
          endpoint: this.endpoint,
          cid: this.cid,
          key: this.key
        });
      }
      return res.data;
    } catch (err) {
      console.error("Gagal mengirim data:", err.message);
      return null;
    }
  }
  async getData({
    endpoint
  }) {
    try {
      console.log("8. Mengambil halaman endpoint:", `${this.origin}/${endpoint}`);
      const res = await axios.get(`${this.origin}/${endpoint}`, {
        headers: {
          ...this.headers,
          referer: `${this.origin}/${endpoint}`,
          cookie: this.cookieString()
        }
      });
      this.updateCookies(res.headers["set-cookie"]);
      const $ = cheerio.load(res.data);
      const value = $("textarea#data").text().trim();
      console.log("9. Data di dalam textarea:", value);
      return value;
    } catch (err) {
      console.error("Gagal mengambil data:", err.message);
      return null;
    }
  }
  async create({
    content
  }) {
    const response = await this.submitData({
      name: content
    });
    if (response == 1) {
      console.log("Informasi: ", {
        endpoint: this.endpoint,
        cid: this.cid,
        key: this.key
      });
      return {
        success: true,
        endpoint: this.endpoint,
        cid: this.cid,
        key: this.key
      };
    } else {
      return {
        success: false,
        message: "Gagal mengirim data"
      };
    }
  }
  async raw({
    id
  }) {
    const data = await this.getData({
      endpoint: id
    });
    if (data) {
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        message: "Data tidak ditemukan"
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
      error: "Missing required field: action",
      required: {
        action: "create | raw"
      }
    });
  }
  const scraper = new KlipitScraper();
  await scraper.init();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: `Missing required field: content (required for ${action})`
          });
        }
        result = await scraper.create(params);
        break;
      case "raw":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await scraper.raw(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: create | raw`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}