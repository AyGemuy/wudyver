import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class EmailnatorClient {
  constructor() {
    console.log("Proses: Inisialisasi client...");
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://www.emailnator.com",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "sec-ch-ua-platform": '"Android"',
        "x-requested-with": "XMLHttpRequest",
        origin: "https://www.emailnator.com",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "accept-language": "id,ms;q=0.9,en;q=0.8"
      }
    }));
    console.log("Proses: Client berhasil diinisialisasi.");
  }
  async getToken() {
    console.log("Proses: Mencari XSRF-TOKEN dari cookie...");
    const cookies = await this.jar.getCookies("https://www.emailnator.com");
    const xsrfCookie = cookies.find(c => c.key === "XSRF-TOKEN");
    const token = xsrfCookie?.value ? decodeURIComponent(xsrfCookie.value) : "";
    if (token) {
      console.log("Proses: XSRF-TOKEN ditemukan.");
    } else {
      console.log("Proses: XSRF-TOKEN tidak ditemukan. Lakukan request awal dulu.");
    }
    return token;
  }
  async create({
    ...rest
  }) {
    console.log("\nProses: Memulai pembuatan email baru...");
    try {
      console.log("Proses: Mengambil cookie awal dari halaman utama...");
      await this.client.get("/");
      const xsrfToken = await this.getToken();
      if (!xsrfToken) {
        throw new Error("Gagal mendapatkan XSRF token. Tidak dapat melanjutkan.");
      }
      const payload = {
        email: rest?.email || ["domain", "plusGmail", "dotGmail"]
      };
      console.log("Proses: Mengirim request POST ke /generate-email");
      const response = await this.client.post("/generate-email", payload, {
        headers: {
          "x-xsrf-token": xsrfToken,
          referer: "https://www.emailnator.com/"
        }
      });
      console.log("Proses: Email berhasil dibuat.");
      return response?.data;
    } catch (error) {
      console.error("Error saat membuat email:", error?.response?.data || error.message);
      return null;
    }
  }
  async check({
    email,
    ...rest
  }) {
    console.log(`\nProses: Memulai pengecekan inbox untuk ${email}...`);
    try {
      if (!email) {
        throw new Error("Alamat email dibutuhkan untuk memeriksa inbox.");
      }
      await this.client.get("/");
      const xsrfToken = await this.getToken();
      if (!xsrfToken) {
        throw new Error("XSRF token tidak ada. Jalankan fungsi create() terlebih dahulu.");
      }
      const payload = {
        email: email
      };
      console.log("Proses: Mengirim request POST ke /message-list");
      const response = await this.client.post("/message-list", payload, {
        headers: {
          "x-xsrf-token": xsrfToken,
          referer: "https://www.emailnator.com/mailbox/"
        }
      });
      console.log("Proses: Inbox berhasil diperiksa.");
      return response?.data;
    } catch (error) {
      console.error("Error saat memeriksa inbox:", error?.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new EmailnatorClient();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await client.create(params);
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email.",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'email@mail.com' }"
          });
        }
        try {
          const messages = await client.check(params);
          return res.status(200).json(messages);
        } catch (error) {
          console.error("API Message Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve messages.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}