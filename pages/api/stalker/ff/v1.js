import axios from "axios";
class FFStalk {
  constructor() {
    this.api = {
      base: "https://tools.freefireinfo.in/profileinfo.php"
    };
    this.headers = {
      authority: "tools.freefireinfo.in",
      accept: "text/data,application/xdata+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://tools.freefireinfo.in",
      referer: "https://tools.freefireinfo.in/",
      "user-agent": "Postify/1.0.0"
    };
  }
  generateCookie() {
    const now = Date.now();
    const timestamp = Math.floor(now / 1e3);
    const visitorId = Math.floor(Math.random() * 1e9);
    const sessionId = Math.random().toString(36).substring(2, 15);
    return `PHPSESSID=${sessionId}; _ga=GA1.1.${visitorId}.${timestamp}; _ga_PDQN6PX6YK=GS1.1.${timestamp}.1.1.${timestamp}.0.0.0`;
  }
  parse(data) {
    try {
      const toCamelCase = str => {
        return str.split(/[\s-_]+/).map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
      };
      const accountInfo = {};
      const info = data.match(/<h3>Your Account Info:<\/h3>\s*(.*?)(?=<br \/>\s*<br \/>)/s);
      if (info) {
        const lines = info[1].split("<br />");
        lines.forEach(line => {
          const match = line.match(/[╭├╰]\s*([^:]+):\s*([^<]+)/);
          if (match) {
            accountInfo[toCamelCase(match[1].trim())] = match[2].trim();
          }
        });
      }
      const booyahPass = {};
      const bm = data.match(/╭\s*Booyah Pass[^]*?(?=<br \/>\s*<br \/>)/);
      if (bm) {
        const lines = bm[0].split("<br />");
        lines.forEach(line => {
          const match = line.match(/[╭╰]\s*([^:]+):\s*([^<]+)/);
          if (match) {
            const key = match[1].trim().toLowerCase().includes("premium") ? "premium" : "level";
            booyahPass[key] = match[2].trim();
          }
        });
      }
      const pet = {};
      const pm = data.match(/🐾\s*Pet Information[^]*?(?=<br \/>\s*<br \/>)/);
      if (pm) {
        const lines = pm[0].split("<br />");
        lines.forEach(line => {
          const match = line.match(/[╭├╰]\s*([^:]+):\s*([^<]+)/);
          if (match) {
            pet[toCamelCase(match[1].trim())] = match[2].trim();
          }
        });
      }
      const guild = {};
      const gm = data.match(/Guild Information[^]*?(?=<br \/>\s*<br \/>)/);
      if (gm) {
        const lines = gm[0].split("<br />");
        lines.forEach(line => {
          const match = line.match(/[╭├╰]\s*([^:]+):\s*([^<]+)/);
          if (match) {
            guild[toCamelCase(match[1].trim())] = match[2].trim();
          }
        });
      }
      const vm = data.match(/Current Version:\s*([^\s<]+)/);
      const version = vm ? vm[1] : null;
      const equippedItems = {
        outfit: [],
        pet: [],
        avatar: [],
        banner: [],
        weapons: [],
        title: []
      };
      const categoryMapping = {
        Outfit: "outfit",
        Pet: "pet",
        Avatar: "avatar",
        Banner: "banner",
        Weapons: "weapons",
        Title: "title"
      };
      Object.entries(categoryMapping).forEach(([dataCategory, jsonCategory]) => {
        const cp = new RegExp(`<h4>${dataCategory}</h4>(.*?)(?=<h4>|<script|$)`, "s");
        const cm = data.match(cp);
        if (cm) {
          const ip = /<div class='equipped-item'><img src='([^']+)' alt='([^']+)'[^>]*><p>([^<]+)<\/p><\/div>/g;
          let im;
          while ((im = ip.exec(cm[1])) !== null) {
            equippedItems[jsonCategory].push({
              imageUrl: im[1],
              itemName: im[2],
              itemDescription: im[3]
            });
          }
        }
      });
      return {
        status: true,
        code: 200,
        message: "Sukses",
        result: {
          accountInfo: accountInfo,
          booyahPass: booyahPass,
          pet: pet,
          guild: guild,
          version: version,
          equippedItems: equippedItems
        }
      };
    } catch (error) {
      return {
        status: false,
        code: 500,
        error: error.message
      };
    }
  }
  async stalk(uid) {
    try {
      if (!uid) {
        return {
          status: false,
          code: 400,
          message: "UID kosong!"
        };
      }
      if (!/^\d+$/.test(uid)) {
        return {
          status: false,
          code: 400,
          message: "UID harus berupa angka!"
        };
      }
      const cookie = this.generateCookie();
      const formData = new URLSearchParams();
      formData.append("uid", uid);
      const response = await axios({
        method: "POST",
        url: this.api.base,
        headers: {
          ...this.headers,
          cookie: cookie
        },
        data: formData,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400
      });
      if (!response.data || typeof response.data !== "string" || response.data.length < 100) {
        return {
          status: false,
          code: 404,
          message: "Tidak ada respons!"
        };
      }
      return this.parse(response.data);
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: {
          type: error.name,
          details: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      id
    } = req.method === "GET" ? req.query : req.body;
    if (!id) {
      return res.status(400).json({
        error: "id are required"
      });
    }
    const generator = new FFStalk();
    const response = await generator.stalk(id);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}