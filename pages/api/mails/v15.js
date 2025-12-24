import axios from "axios";
import * as cheerio from "cheerio";
class TempMailCool {
  constructor() {
    this.baseUrl = "https://www.tempmail.cool";
    this.currentEmail = null;
  }
  async create() {
    try {
      console.log("Membuat alamat email sementara baru...");
      const response = await axios.get(`${this.baseUrl}/en/`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image:apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const email = $("span[data-email]").eq(0).attr("data-email");
      if (email) {
        this.currentEmail = email;
        console.log("Email sementara berhasil dibuat:", this.currentEmail);
        return {
          email: this.currentEmail
        };
      } else {
        console.error("Gagal menemukan alamat email di halaman.");
        return null;
      }
    } catch (error) {
      console.error("Gagal membuat email sementara:", error.response ? error.response.data : error.message);
      return null;
    }
  }
  async getMailDetail(mailId, email) {
    if (!mailId || !email) {
      console.error("ID email dan alamat email diperlukan untuk mengambil detail.");
      return null;
    }
    try {
      console.log(`Mengambil detail untuk pesan ID: ${mailId}...`);
      const encodedEmail = encodeURIComponent(email);
      const response = await axios.get(`${this.baseUrl}/emailDetail?id=${mailId}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=0, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "iframe",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          cookie: `email=${encodedEmail}`
        }
      });
      const $ = cheerio.load(response.data);
      const emailBody = $("body").html() || "";
      const emailText = $('div[dir="auto"]').text().trim();
      return {
        html: emailBody,
        text: emailText
      };
    } catch (error) {
      console.error(`Gagal mengambil detail untuk pesan ID ${mailId}:`, error.response ? error.response.data : error.message);
      return null;
    }
  }
  async message(options = {}) {
    const {
      email = this.currentEmail
    } = options;
    if (!email) {
      console.error("Tidak ada email sementara yang dibuat. Panggil createMail() terlebih dahulu atau berikan email.");
      return null;
    }
    this.currentEmail = email;
    try {
      console.log(`Mengambil daftar pesan untuk email: ${email}...`);
      const encodedEmail = encodeURIComponent(email);
      const response = await axios.get(`${this.baseUrl}/emails`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/533.36",
          cookie: `email=${encodedEmail}`
        }
      });
      const rawMessages = response.data;
      const messagesWithDetails = [];
      for (const msg of rawMessages) {
        const detail = await this.getMailDetail(msg.id, email);
        messagesWithDetails.push({
          ...msg,
          ...detail
        });
      }
      if (messagesWithDetails.length > 0) {
        console.log(`Ditemukan ${messagesWithDetails.length} pesan (dengan detail) untuk ${email}.`);
        return messagesWithDetails;
      } else {
        console.log(`Tidak ada pesan baru untuk ${email}.`);
        return [];
      }
    } catch (error) {
      console.error("Gagal mengambil pesan:", error.response ? error.response.data : error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TempMailCool();
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