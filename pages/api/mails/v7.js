import axios from "axios";
import * as cheerio from "cheerio";
class TempMail {
  constructor() {
    this.baseUrl = "https://tempmail.plus";
  }
  async getDomain() {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/en/`);
      const $ = cheerio.load(data);
      const domains = [];
      $(".dropdown-menu .dropdown-item").each((_, el) => {
        domains.push($(el).text().trim());
      });
      return domains.length ? domains : ["fexpost.com"];
    } catch (error) {
      console.error("Error fetching domains:", error);
      return ["fexpost.com"];
    }
  }
  generateLocal() {
    return `user${Math.floor(Math.random() * 1e5)}`;
  }
  async create({
    email
  }) {
    try {
      const domains = await this.getDomain();
      let [local, domain] = (email || "").split("@");
      local = local || this.generateLocal();
      domain = domains.includes(domain) ? domain : domains[Math.floor(Math.random() * domains.length)];
      return {
        email: `${local}@${domain}`
      };
    } catch (error) {
      console.error("Error generating email:", error);
      return {
        email: null
      };
    }
  }
  async message({
    email
  }) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/mails`, {
        params: {
          email: email,
          first_id: 0,
          epin: ""
        },
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "accept-language": "id-ID,id;q=0.9",
          cookie: `email=${email}`,
          priority: "u=1, i",
          referer: `${this.baseUrl}/en/`,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching emails:", error);
      return null;
    }
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
        try {
          if (!params.email) {
            return res.status(400).json({
              error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
            });
          }
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