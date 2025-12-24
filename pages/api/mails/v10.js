import axios from "axios";
import * as crypto from "crypto";
class TempMailAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://best-temp-mail.com/api/v2",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://best-temp-mail.com",
        priority: "u=1, i",
        referer: "https://best-temp-mail.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this._cookies = {};
    this.emailAddress = null;
    this.intToken = null;
  }
  async create() {
    try {
      this.intToken = crypto.randomUUID();
      const response = await this.axiosInstance.post("/createEmail", {
        intToken: this.intToken
      });
      if (response.data && response.data.data) {
        this.emailAddress = response.data.data.address || null;
      }
      return response.data;
    } catch (error) {
      console.error("Error creating email:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async message({
    email,
    id,
    update_tag
  }) {
    if (!this.intToken) {
      throw new Error("intToken is not set. Please call `create()` first.");
    }
    if (!email || !id || !update_tag) {
      throw new Error("Email, ID, and update_tag are required for the message method.");
    }
    try {
      const response = await this.axiosInstance.post("/getEmailList", {
        address: email,
        id: id,
        intToken: this.intToken,
        update_tag: update_tag
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching messages:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const tempMail = new TempMailAPI();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await tempMail.create();
          return res.status(200).json(newData);
        } catch (error) {
          return res.status(500).json({
            error: "Gagal membuat email."
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Paramenter 'email' hilang. Contoh: { email: 'ce7d174b-0652-458b-9bd8-c42ebf80eda2@emailhook.site' }"
          });
        }
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' hilang. Contoh: { email: 'ce7d174b-0652-458b-9bd8-c42ebf80eda2' }"
          });
        }
        if (!params.update_tag) {
          return res.status(400).json({
            error: "Paramenter 'update_tag' hilang. Contoh: { email: 'ce7d174b-0652-458b-9bd8-c42ebf80eda2' }"
          });
        }
        try {
          const messages = await tempMail.message(params);
          return res.status(200).json(messages);
        } catch (error) {
          return res.status(500).json({
            error: "Gagal mengambil pesan."
          });
        }
      default:
        return res.status(400).json({
          error: "Tindakan tidak valid. Gunakan 'create', atau 'message'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Kesalahan Server Internal"
    });
  }
}