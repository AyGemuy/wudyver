import axios from "axios";
class EmailService {
  constructor() {
    this.baseURL = "https://app.sonjj.com/v1/temp_email";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      referer: "https://smailpro.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.cookie = "";
  }
  async getCookies(url) {
    try {
      console.log(`Fetching cookies from: ${url}`);
      const response = await axios.get(url, {
        headers: this.headers
      });
      this.cookie = response.headers["set-cookie"]?.join("; ") || "";
      console.log(`Retrieved cookies: ${this.cookie}`);
    } catch (error) {
      console.error("Error fetching cookies:", error);
      throw error;
    }
  }
  async create() {
    try {
      const url = "https://smailpro.com/app/payload?url=https%3A%2F%2Fapp.sonjj.com%2Fv1%2Ftemp_email%2Fcreate";
      await this.getCookies(url);
      const payloadResponse = await axios.get(url, {
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      const payload = payloadResponse.data;
      console.log(`Retrieved payload: ${payload}`);
      const createResponse = await axios.get(`${this.baseURL}/create?payload=${payload}`, {
        headers: {
          ...this.headers,
          origin: "https://smailpro.com",
          cookie: this.cookie
        }
      });
      console.log("Email created successfully");
      return createResponse.data;
    } catch (error) {
      console.error("Error creating email:", error);
      throw error;
    }
  }
  async getInbox(email) {
    try {
      const url = `https://smailpro.com/app/payload?url=https%3A%2F%2Fapp.sonjj.com%2Fv1%2Ftemp_email%2Finbox&email=${email}`;
      await this.getCookies(url);
      const inboxPayloadResponse = await axios.get(url, {
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      const inboxPayload = inboxPayloadResponse.data;
      console.log(`Retrieved inbox payload: ${inboxPayload}`);
      const inboxResponse = await axios.get(`${this.baseURL}/inbox?payload=${inboxPayload}`, {
        headers: {
          ...this.headers,
          origin: "https://smailpro.com",
          cookie: this.cookie
        }
      });
      console.log("Inbox retrieved successfully");
      return inboxResponse.data;
    } catch (error) {
      console.error("Error fetching inbox:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    email
  } = req.method === "GET" ? req.query : req.body;
  const emailService = new EmailService();
  switch (action) {
    case "create":
      try {
        const result = await emailService.create();
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    case "message":
      if (!email) {
        return res.status(400).json({
          error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
        });
      }
      try {
        const result = await emailService.getInbox(email);
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
      return res.status(400).json({
        success: false,
        error: "Action is required. Available actions: create, message"
      });
  }
}