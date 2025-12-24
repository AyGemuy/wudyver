import axios from "axios";
import crypto from "crypto";
class NoopMail {
  constructor() {
    this.baseURL = "https://noopmail.org/api/c";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://noopmail.org",
      priority: "u=1, i",
      referer: "https://noopmail.org/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  getDomainList() {
    try {
      return {
        date: new Date().toISOString(),
        domain: ["20minutesmail.com", "eligou.store", "hooooooo.store", "kaksjhdh.site", "mainkask.site", "nhoopmail.store", "noopmail.com", "noopmail.org", "oooooooo.store", "prohisi.store", "temppppo.store"]
      };
    } catch {
      return {
        date: new Date().toISOString(),
        domain: []
      };
    }
  }
  create({
    name = crypto.randomBytes(4).toString("hex")
  }) {
    try {
      return {
        email: `${name}@${this.getDomainList().domain[0]}`
      };
    } catch {
      return null;
    }
  }
  async message({
    email
  }) {
    try {
      const response = await axios.post(this.baseURL, {
        e: email.split("@")[0],
        d: email.split("@")[1]
      }, {
        headers: this.headers
      });
      return response.data;
    } catch {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const noopMail = new NoopMail();
  try {
    switch (action) {
      case "list":
        try {
          return res.json(noopMail.getDomainList());
        } catch {
          return res.status(500).json({
            error: "Failed to retrieve domain list."
          });
        }
      case "create":
        try {
          const email = noopMail.create(params);
          return res.json(email);
        } catch {
          return res.status(500).json({
            error: "Failed to create email."
          });
        }
      case "message":
        try {
          if (!params.email) {
            return res.status(400).json({
              error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
            });
          }
          const messages = await noopMail.message(params);
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