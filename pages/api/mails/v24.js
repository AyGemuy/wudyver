import fetch from "node-fetch";
const randomStr = (len = 12) => Math.random().toString(36).substring(2, 2 + len);
class TempMailClient {
  constructor({
    base = "https://api.internal.temp-mail.io/api/v3/"
  } = {}) {
    this.base = base.endsWith("/") ? base : base + "/";
  }
  async _call(method, path, body = null, query = {}) {
    const url = new URL(this.base + path);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, v);
    });
    const opts = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TempMailClient/1.0"
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(text);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    if (ct.includes("text") || ct.includes("eml")) return text;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  }
  async domains() {
    return await this._call("GET", "domains");
  }
  async create({
    name,
    domain,
    token
  } = {}) {
    let availableDomains = ["tempmail.com"];
    if (!domain || typeof domain !== "string" || domain.trim() === "" || !domain.includes(".")) {
      try {
        const resp = await this.domains();
        if (Array.isArray(resp?.domains) && resp.domains.length > 0) {
          availableDomains = resp.domains.map(d => d.name).filter(n => n && typeof n === "string");
        }
      } catch (err) {
        console.warn("Failed to fetch domains, using fallback:", err.message);
      }
      if (availableDomains.length > 0) {
        domain = availableDomains[Math.floor(Math.random() * availableDomains.length)];
      }
    }
    if (typeof domain !== "string" || !domain.includes(".")) {
      throw new Error("Domain must be a valid string (e.g. tempmail.com)");
    }
    const payload = {
      name: (name && typeof name === "string" ? name.trim() : null) || `user${Math.floor(Math.random() * 999999)}`,
      domain: domain.trim(),
      token: token || `token_${randomStr()}`
    };
    return await this._call("POST", "email/new", payload);
  }
  async messages({
    email
  } = {}) {
    if (!email || typeof email !== "string") throw new Error("email required and must be string");
    return await this._call("GET", `email/${encodeURIComponent(email)}/messages`);
  }
  async source({
    messageId
  } = {}) {
    if (!messageId) throw new Error("messageId required");
    return await this._call("GET", `message/${messageId}/source_code`);
  }
  async download({
    messageId
  } = {}) {
    if (!messageId) throw new Error("messageId required");
    return await this._call("GET", `message/${messageId}/source_code`, null, {
      download: 1
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new TempMailClient();
  try {
    let result;
    let status = 200;
    switch (action) {
      case "create":
        result = await api.create();
        status = 201;
        break;
      case "custom":
        if (!params.alias || typeof params.alias !== "string") {
          return res.status(400).json({
            success: false,
            error: "Missing or invalid 'alias' (must be string)"
          });
        }
        const customDomain = typeof params.domain === "string" && params.domain.includes(".") ? params.domain.trim() : undefined;
        result = await api.create({
          name: params.alias.trim(),
          domain: customDomain
        });
        status = 201;
        break;
      case "messages":
        if (!params.email || typeof params.email !== "string") {
          return res.status(400).json({
            success: false,
            error: "Missing or invalid 'email'"
          });
        }
        result = await api.messages({
          email: params.email.trim()
        });
        break;
      case "domains":
        result = await api.domains();
        break;
      case "source":
        if (!params.messageId) {
          return res.status(400).json({
            success: false,
            error: "Missing 'messageId'"
          });
        }
        result = await api.source({
          messageId: params.messageId
        });
        break;
      case "download":
        if (!params.messageId) {
          return res.status(400).json({
            success: false,
            error: "Missing 'messageId'"
          });
        }
        const buffer = await api.download({
          messageId: params.messageId
        });
        result = {
          filename: `${params.messageId}.eml`,
          content: buffer.toString("base64"),
          encoding: "base64",
          size: buffer.length
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Available: create, custom, messages, domains, source, download"
        });
    }
    return res.status(status).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("TempMail API Error:", error.message);
    const httpStatus = error.message.includes("HTTP 4") ? 400 : 500;
    return res.status(httpStatus).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}