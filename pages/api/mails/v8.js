import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.baseURL = "https://api.internal.temp-mail.io/api/v3";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "application-name": "web",
      "application-version": "4.0.0",
      "content-type": "application/json",
      origin: "https://temp-mail.io",
      priority: "u=1, i",
      referer: "https://temp-mail.io/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-cors-header": "iaWg3pchvFx48fY"
    };
    this.defaultDomain = "dygovil.com";
  }
  generateName(length = 6) {
    return crypto.randomBytes(length / 2).toString("hex");
  }
  parseEmail(email) {
    const [name, domain] = email.split("@");
    return {
      name: name,
      domain: domain
    };
  }
  async message({
    email = `${this.generateName()}@${this.defaultDomain}`
  } = {}) {
    const {
      name,
      domain
    } = this.parseEmail(email);
    try {
      const res = await axios.get(`${this.baseURL}/email/${name}@${domain}/messages`, {
        headers: this.headers
      });
      return {
        email: email,
        name: name,
        domain: domain,
        messages: res.data
      };
    } catch (err) {
      return {
        email: email,
        name: name,
        domain: domain,
        error: true,
        message: err.message
      };
    }
  }
  async create({
    email = `${this.generateName()}@${this.defaultDomain}`
  } = {}) {
    const {
      name,
      domain
    } = this.parseEmail(email);
    return {
      email: email,
      name: name,
      domain: domain
    };
  }
  async getDomain() {
    const res = await axios.get(`${this.baseURL}/domains`, {
      headers: this.headers
    });
    return res.data;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const tmpMail = new TempMail();
  try {
    switch (action) {
      case "list":
        try {
          const domain = await tmpMail.getDomain();
          return res.json(domain);
        } catch {
          return res.status(500).json({
            error: "Failed to retrieve domain list."
          });
        }
      case "create":
        try {
          const email = await tmpMail.create(params);
          return res.json(email);
        } catch {
          return res.status(500).json({
            error: "Failed to create email."
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await tmpMail.message(params);
          return res.json(messages);
        } catch {
          return res.status(500).json({
            error: "Failed to retrieve messages."
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'list', 'create', or 'message'."
        });
    }
  } catch {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}