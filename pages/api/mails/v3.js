import axios from "axios";
class MailDaxApi {
  constructor() {
    this.baseUrl = "https://api2.maildax.com/api/email";
    this.checkUrl = "https://api2.maildax.com/api/email/mails";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-length": "0",
      origin: "https://maildax.com",
      priority: "u=1, i",
      referer: "https://maildax.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async create() {
    try {
      const response = await axios.post(this.baseUrl, null, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
  async check(email, secret) {
    try {
      const response = await axios.get(this.checkUrl, {
        params: {
          email: email,
          secret: secret
        },
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error checking email:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    email,
    secret
  } = req.method === "GET" ? req.query : req.body;
  const mailDax = new MailDaxApi();
  const availableActions = ["create", "message"];
  switch (action) {
    case "create":
      try {
        const result = await mailDax.create();
        return res.status(200).json({
          success: true,
          result: result
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    case "message":
      if (!email || !secret) {
        return res.status(400).json({
          success: false,
          error: "Missing email or secret for 'message' action."
        });
      }
      try {
        const result = await mailDax.check(email, secret);
        return res.status(200).json({
          success: true,
          result: result
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    default:
      if (!action) {
        return res.status(400).json({
          success: false,
          error: `Action is required. Available actions: ${availableActions.join(", ")}`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Invalid action: "${action}". Available actions: ${availableActions.join(", ")}`
        });
      }
  }
}