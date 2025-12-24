import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AxiosDownloader {
  constructor(options = {}) {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar
    }));
    const defaultUa = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";
    this.baseHeaders = {
      authority: "j2download.com",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": options.userAgent || defaultUa
    };
  }
  async download({
    url,
    ...rest
  }) {
    if (!url) {
      console.error("Error: URL is required.");
      return null;
    }
    console.log(`[+] Memulai proses untuk URL: ${url}`);
    try {
      console.log("[+] Langkah 1: Mengambil cookie dan CSRF token dari halaman utama...");
      const homeResponse = await this.client.get("https://j2download.com", {
        headers: {
          ...this.baseHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        }
      });
      const cookies = await this.cookieJar.getCookies("https://j2download.com");
      const csrfCookie = cookies.find(cookie => cookie.key === "csrf_token");
      const csrfToken = csrfCookie ? csrfCookie.value : "";
      if (!csrfToken) {
        console.error("[-] Gagal mendapatkan CSRF token.");
        return null;
      }
      console.log(`[+] Berhasil mendapatkan CSRF token: ${csrfToken}`);
      console.log("[+] Langkah 2: Mengirim permintaan ke API untuk mendapatkan hasil...");
      const result = await this.client.post("https://j2download.com/api/autolink", {
        data: {
          url: url,
          unlock: true,
          ...rest
        }
      }, {
        headers: {
          ...this.baseHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://j2download.com",
          referer: "https://j2download.com/id",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-csrf-token": csrfToken
        }
      });
      console.log("[+] Proses selesai.");
      return result?.data || null;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      console.error(`[-] Terjadi error: ${errorMessage}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new AxiosDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}