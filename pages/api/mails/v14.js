import axios from "axios";
class FreeCustomEmail {
  constructor() {
    this.baseUrl = "https://www.freecustom.email/api";
    this.token = null;
    this.mailboxName = null;
    this.domains = ["saleis.live", "arrangewith.me"];
    this._initialize();
  }
  async _initialize() {
    await this.init();
  }
  _generateRandomEmail(domainIndex = 0) {
    let selectedDomain = this.domains[domainIndex % this.domains.length];
    let chars = "abcdefghijklmnopqrstuvwxyz";
    let prefix = "";
    for (let i = 0; i < 6; i++) {
      prefix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}@${selectedDomain}`;
  }
  async init() {
    if (this.token) {
      console.log("Token sudah tersedia.");
      return {
        token: this.token,
        mailbox: this.mailboxName
      };
    }
    try {
      console.log("Mendapatkan token...");
      const response = await axios.post(`${this.baseUrl}/auth`, null, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-length": "0",
          "content-type": "application/json",
          origin: "https://www.freecustom.email",
          priority: "u=1, i",
          referer: "https://www.freecustom.email/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      this.token = response.data.token;
      this.mailboxName = this._generateRandomEmail().split("@")[0];
      console.log("Token berhasil didapatkan:", this.token);
      console.log("Mailbox otomatis dibuat:", this.mailboxName);
      return {
        token: this.token,
        mailbox: this.mailboxName
      };
    } catch (error) {
      console.error("Gagal mendapatkan token:", error.response ? error.response.data : error.message);
      this.token = null;
      this.mailboxName = null;
      return null;
    }
  }
  async create() {
    if (!this.token) {
      console.log("Menunggu inisialisasi...");
      await this._initialize();
    }
    if (!this.token) {
      console.error("Tidak dapat otentikasi setelah inisialisasi.");
      return null;
    }
    if (!this.mailboxName) {
      console.error("Nama mailbox belum diatur.");
      return null;
    }
    try {
      console.log(`Mengambil pesan dari mailbox: ${this.mailboxName}...`);
      const response = await axios.get(`${this.baseUrl}/mailbox?mailbox=${this.mailboxName}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.token}`,
          priority: "u=1, i",
          referer: "https://www.freecustom.email/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      if (response.data.success) {
        console.log(`Pesan dari mailbox ${this.mailboxName} berhasil diambil.`);
        return response.data.data;
      } else {
        console.error("Gagal mendapatkan mailbox:", response.data.message);
        return null;
      }
    } catch (error) {
      console.error("Gagal mengambil mailbox:", error.response ? error.response.data : error.message);
      return null;
    }
  }
  async message({
    email
  }) {
    if (!this.token) {
      console.log("Menunggu inisialisasi...");
      await this._initialize();
    }
    if (!this.token) {
      console.error("Tidak dapat otentikasi setelah inisialisasi untuk memeriksa pesan.");
      return null;
    }
    const mailboxPrefix = email.split("@")[0];
    let messagesSummary = null;
    try {
      console.log(`Mengambil daftar pesan untuk mailbox: ${mailboxPrefix}...`);
      const summaryResponse = await axios.get(`${this.baseUrl}/mailbox?mailbox=${mailboxPrefix}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.token}`,
          priority: "u=1, i",
          referer: "https://www.freecustom.email/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      if (summaryResponse.data.success) {
        messagesSummary = summaryResponse.data.data;
      } else {
        console.error(`Gagal mendapatkan daftar pesan untuk ${mailboxPrefix}:`, summaryResponse.data.message);
        return null;
      }
    } catch (error) {
      console.error(`Gagal mengambil daftar pesan untuk ${mailboxPrefix}:`, error.response ? error.response.data : error.message);
      return null;
    }
    if (!messagesSummary || messagesSummary.length === 0) {
      console.log(`Tidak ada pesan yang ditemukan untuk mailbox: ${mailboxPrefix}`);
      return [];
    }
    const messageDetails = [];
    console.log(`Mengambil detail untuk ${messagesSummary.length} pesan di mailbox: ${mailboxPrefix}`);
    for (const msg of messagesSummary) {
      try {
        const response = await axios.get(`${this.baseUrl}/mailbox?mailbox=${mailboxPrefix}&messageId=${msg.id}`, {
          headers: {
            accept: "*/*",
            "accept-language": "id-ID,id;q=0.9",
            authorization: `Bearer ${this.token}`,
            priority: "u=1, i",
            referer: "https://www.freecustom.email/",
            "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
          }
        });
        if (response.data.success) {
          messageDetails.push(response.data.data);
          console.log(`Detail pesan ID ${msg.id} berhasil diambil.`);
        } else {
          console.warn(`Gagal mendapatkan detail pesan ID ${msg.id}:`, response.data.message);
        }
      } catch (error) {
        console.error(`Gagal mengambil detail pesan ID ${msg.id}:`, error.response ? error.response.data : error.message);
      }
    }
    return messageDetails;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new FreeCustomEmail();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await client.create();
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email and UUID.",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await client.message(params);
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