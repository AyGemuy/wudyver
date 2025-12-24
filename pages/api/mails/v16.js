import axios from "axios";
class TemporaryMail {
  constructor() {
    this.baseUrl = "https://temporarymail.com/api/";
    this.currentEmail = null;
    this.secretKey = null;
  }
  async create() {
    try {
      console.log("Membuat alamat email sementara baru dari temporarymail.com...");
      const response = await axios.get(`${this.baseUrl}?action=requestEmailAccess&key=&value=random`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          referer: "https://temporarymail.com/en/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const data = response.data;
      if (data && data.address && data.secretKey) {
        this.currentEmail = data.address;
        this.secretKey = data.secretKey;
        console.log("Email sementara berhasil dibuat:");
        console.log({
          email: this.currentEmail,
          key: this.secretKey
        });
        return {
          email: this.currentEmail,
          key: this.secretKey
        };
      } else {
        console.error("Gagal membuat alamat email sementara: Respons tidak valid.");
        return null;
      }
    } catch (error) {
      console.error("Gagal membuat email sementara:", error.response ? error.response.data : error.message);
      return null;
    }
  }
  async message({
    email = this.currentEmail,
    key = this.secretKey
  } = {}) {
    if (!key) {
      console.error("Secret Key tidak ditemukan. Panggil create() terlebih dahulu atau berikan Secret Key dan email.");
      return null;
    }
    this.currentEmail = email;
    this.secretKey = key;
    try {
      console.log(`Mengecek inbox untuk Secret Key: ${key}...`);
      const response = await axios.get(`${this.baseUrl}?action=checkInbox&value=${key}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          referer: "https://temporarymail.com/en/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const rawMessages = response.data;
      const messages = Object.keys(rawMessages).map(messageId => {
        const msg = rawMessages[messageId];
        return {
          id: msg.id,
          from: msg.from,
          name: msg.name,
          to: msg.to,
          subject: msg.subject,
          date: msg.date,
          sourceHash: msg.sourceHash,
          attachments: msg.attachments
        };
      });
      const messagesWithDetails = [];
      if (messages.length > 0) {
        console.log(`Ditemukan ${messages.length} pesan di inbox. Mengambil detail setiap pesan...`);
        for (const msg of messages) {
          const detail = await this.getEmailDetail(msg.id);
          messagesWithDetails.push({
            ...msg,
            detail: detail
          });
        }
      }
      if (messagesWithDetails.length > 0) {
        console.log(`Ditemukan ${messagesWithDetails.length} pesan (dengan detail) untuk ${email}.`);
        return messagesWithDetails;
      } else {
        console.log("Inbox saat ini kosong atau gagal mengambil detail.");
        return [];
      }
    } catch (error) {
      console.error("Gagal mengecek inbox atau mengambil detail pesan:", error.response ? error.response.data : error.message);
      return null;
    }
  }
  async getEmailDetail(messageId) {
    if (!messageId) {
      console.error("ID pesan diperlukan untuk mengambil detail email.");
      return null;
    }
    try {
      console.log(`Mengambil detail untuk pesan ID: ${messageId}...`);
      const response = await axios.post(`${this.baseUrl}?action=getEmail&value=${messageId}`, null, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-length": "0",
          origin: "https://temporarymail.com",
          priority: "u=1, i",
          referer: "https://temporarymail.com/en/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const emailDetail = response.data[messageId];
      if (emailDetail) {
        console.log(`Detail pesan untuk ID ${messageId} berhasil diambil.`);
        return emailDetail;
      } else {
        console.warn(`Detail pesan untuk ID ${messageId} tidak ditemukan dalam respons.`);
        return null;
      }
    } catch (error) {
      console.error(`Gagal mengambil detail email untuk ID ${messageId}:`, error.response ? error.response.data : error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TemporaryMail();
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
        if (!params.key) {
          return res.status(400).json({
            error: "Missing 'key' parameter. Example: { key: 'xxxxx' }"
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