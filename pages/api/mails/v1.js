import axios from "axios";
class MailTM {
  constructor() {
    this.baseUrl = "https://api.mail.tm";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
        Referer: "https://internxt.com/temporary-email"
      }
    });
  }
  async getDomains() {
    try {
      const {
        data
      } = await this.client.get("/domains?page=1");
      return data.length ? data[0].domain : null;
    } catch {
      return null;
    }
  }
  async create({
    email,
    pass
  }) {
    if (!email) {
      const domain = await this.getDomains();
      if (!domain) return {
        error: "No active domains available."
      };
      email = `user${Date.now()}@${domain}`;
    }
    try {
      await this.client.post("/accounts", {
        address: email,
        password: pass
      });
      return {
        email: email,
        pass: pass
      };
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async getToken({
    email,
    pass
  }) {
    try {
      const {
        data
      } = await this.client.post("/token", {
        address: email,
        password: pass
      });
      return {
        token: data.token
      };
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async message({
    token,
    page = 1
  }) {
    if (!token) return {
      error: "No token provided."
    };
    try {
      const {
        data
      } = await this.client.get(`/messages?page=${page}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      return data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const mailtm = new MailTM();
    let result;
    switch (action) {
      case "create":
        result = await mailtm.create(params);
        break;
      case "message":
        result = await mailtm.message(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}