import axios from "axios";
import {
  io
} from "socket.io-client";
import * as cheerio from "cheerio";
class EmailCheck {
  constructor(baseUrl = "https://generator.email", timeout = 1e4) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }
  async check(email) {
    const [name, domain] = email.split("@");
    const cookie = `surl=${encodeURIComponent(domain)}/${encodeURIComponent(name)}`;
    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          Cookie: cookie
        },
        timeout: this.timeout
      });
      const $ = cheerio.load(response.data);
      const messageCount = parseInt($("#mess_number").text(), 10) || 0;
      const emails = $("#email-table .e7m.list-group-item").map((index, el) => {
        const sender = $(el).find(".e7m.from_div_45g45gg").text().trim();
        const subject = $(el).find(".e7m.subj_div_45g45gg").text().trim();
        const time = $(el).find(".e7m.time_div_45g45gg").text().trim();
        const linkPath = $(el).attr("href");
        const fullLink = this.baseUrl + linkPath;
        return {
          sender: sender,
          subject: subject,
          time: time,
          link: fullLink
        };
      }).get();
      const messages = [];
      for (const email of emails) {
        const cookies = `surl=${encodeURIComponent(domain)}/${encodeURIComponent(name)}/${email.link.split("/").pop()}`;
        const responseDetails = await this.getRetry(email.link, cookies);
        const $$ = cheerio.load(responseDetails.data);
        const messageContent = $$(".e7m.mess_bodiyy").html();
        const extractedMessages = this.extract(messageContent);
        messages.push({
          ...email,
          message: extractedMessages
        });
      }
      return {
        success: true,
        emails: messages,
        messageCount: messageCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async getRetry(url, cookies, retries = 3) {
    let attempt = 0;
    let response;
    while (attempt < retries) {
      try {
        response = await axios.get(url, {
          headers: {
            Cookie: cookies
          },
          timeout: this.timeout
        });
        return response;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          throw new Error(`Request failed after ${retries} attempts: ${error.message}`);
        }
      }
    }
  }
  extract(messageContent) {
    const $ = cheerio.load(messageContent);
    let message = "";
    $('div[dir="auto"]').each((index, element) => {
      message += $(element).text().trim() + "\n";
    });
    return message.trim();
  }
}
class EmailGeneratior {
  constructor() {
    this.baseUrl = "https://generator.email";
    this.socket = io("wss://generator.email", {
      path: "/socket.io",
      transports: ["websocket"]
    });
    this.email = null;
  }
  async getDomains() {
    try {
      const {
        data
      } = await axios.get(this.baseUrl);
      const domains = cheerio.load(data)("#newselect .tt-suggestion p").map((_, el) => el.children[0].data.trim()).get();
      return {
        success: true,
        domains: domains
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  randomEmail(domain = "mail.com") {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let username = "";
    for (let i = 0; i < 10; i++) {
      username += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${username}@${domain}`;
  }
  async createEmail({
    email = this.randomEmail()
  }) {
    try {
      const {
        success,
        domains
      } = await this.getDomains();
      if (!success) throw new Error("Gagal mengambil daftar domain");
      let [username, domain] = email.toLowerCase().split("@");
      if (!domains.includes(domain)) domain = domains[Math.floor(Math.random() * domains.length)];
      this.email = `${username}@${domain}`;
      this.socket.emit("watch_for_my_email", this.email);
      return {
        success: true,
        message: domain !== email.split("@")[1] ? `Domain tidak tersedia, menggunakan: ${domain}` : "Email berhasil dibuat",
        email: this.email
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  async deleteEmail() {
    try {
      const response = await axios.post(`${this.baseUrl}/del_mail.php`, {
        recieved: "p2a4h5z2d4c443h544o2k4o5e4e4h4h4g4v5z3a4v5f4z344m594i5u2z3547616j4o4g4x5x5y5a4s514q2k584k523v29444x2x2k5u25443u203j5a484d4q26484o584h534b4t2a494s294l2m5v5h5g4u524l4k5s4241313j5x2o2o2"
      });
      this.email = null;
      return {
        success: true,
        message: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  async checkMessages({
    email
  }) {
    try {
      if (!email) throw new Error("Email diperlukan!");
      const emailGen = new EmailCheck();
      const result = await emailGen.check(email);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const emailService = new EmailGeneratior();
    let result;
    switch (action) {
      case "create":
        result = await emailService.createEmail(params);
        break;
      case "delete":
        result = await emailService.deleteEmail();
        break;
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        result = await emailService.checkMessages(params);
        break;
      case "domains":
        result = await emailService.getDomains();
        break;
      default:
        throw new Error("Aksi tidak valid");
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}