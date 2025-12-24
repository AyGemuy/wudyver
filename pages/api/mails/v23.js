import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TempamailAPI {
  constructor(customConfig = {}) {
    this.config = {
      baseUrl: "https://api.tempamail.com/api",
      uuid: null,
      selectedEmailId: null,
      knownMessageId: 10,
      appUuid: "ba3-ce1be-d1sa",
      appVersionCode: 126,
      ...customConfig
    };
    this.state = {
      alias: null,
      domainId: 101
    };
  }
  genAlias() {
    return `user.${Math.random().toString(36).substring(2, 10)}`;
  }
  body(route) {
    const b = {};
    const uuid = this.config.uuid;
    const selectedEmailId = this.config.selectedEmailId;
    const knownMessageId = this.config.knownMessageId;
    switch (route) {
      case 0:
        b.uuid = uuid;
        b.selected_email_id = selectedEmailId;
        b.known_message_id = knownMessageId;
        break;
      case 1:
        b.uuid = uuid;
        break;
      case 3:
        b.app_uuid = this.config.appUuid;
        break;
      case 4:
        b.uuid = uuid;
        break;
      case 5:
        b.uuid = uuid;
        b.alias = this.state.alias;
        b.domain_id = this.state.domainId;
        break;
      case 6:
        b.uuid = uuid;
        b.selected_email_id = selectedEmailId;
        break;
    }
    return b;
  }
  url(route) {
    const urls = ["messages", "domains", "client", "client/create", "email/random", "email/custom", "email/delete"];
    return `${this.config.baseUrl}/${urls[route]}`;
  }
  async req(route, override = {}) {
    if (!this.config.uuid && route !== 3) {
      await this.ensureClient();
    }
    const endpoint = this.url(route);
    const payload = {
      ...this.body(route),
      ...override
    };
    console.log(`\n[ROUTE ${route}] ${endpoint}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log("Status:", response.status, response.statusText);
    console.log("Response:", JSON.stringify(data, null, 2));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || "Unknown error"}`);
    }
    return data;
  }
  async ensureClient() {
    if (this.config.uuid) return;
    console.log("Creating new client...");
    const result = await this.req(3);
    this.config.uuid = result.client.uuid;
    this.config.selectedEmailId = result.email?.id || Math.floor(Math.random() * 1e12);
    this.state.alias = this.genAlias();
    this.state.domainId = 101;
    console.log("Client created:", this.config.uuid);
    console.log("Email ID set:", this.config.selectedEmailId);
  }
  parseEmailData(data) {
    if (!data.email) return null;
    return {
      id: data.email.id,
      alias: data.email.alias,
      domain: data.email.domain_name,
      fullEmail: `${data.email.alias}@${data.email.domain_name}`,
      type: data.email.type,
      createdAt: data.email.created_at,
      client: data.client ? {
        uuid: data.client.uuid,
        refId: data.client.ref_id,
        type: data.client.type
      } : null
    };
  }
  parseMessagesData(data) {
    if (!data.messages || !Array.isArray(data.messages)) return [];
    return data.messages.map(msg => {
      let fromParsed = {
        name: "",
        address: ""
      };
      try {
        fromParsed = typeof msg.from === "string" ? JSON.parse(msg.from) : msg.from;
      } catch (e) {
        console.warn("Failed to parse from field:", msg.from);
      }
      return {
        id: msg.id,
        email_id: msg.email_id,
        from: fromParsed,
        subject: msg.subject || "",
        body: msg.body || "",
        htmlBody: this.extractHtmlBody(msg.body),
        textBody: this.extractTextBody(msg.body),
        createdAt: msg.created_at,
        timestamp: new Date(msg.created_at).getTime()
      };
    });
  }
  parseDomainsData(data) {
    if (!data.domains || !Array.isArray(data.domains)) return [];
    return data.domains.map(domain => ({
      id: domain.id,
      name: domain.name,
      type: domain.type,
      isActive: domain.type === 0
    }));
  }
  extractHtmlBody(body) {
    if (!body) return "";
    const $ = cheerio.load(body, null, false);
    const firstElement = $.root().children().first();
    if (firstElement.length) {
      return $.html(firstElement);
    }
    return body;
  }
  extractTextBody(body) {
    if (!body) return "";
    const $ = cheerio.load(body, null, false);
    return $.root().text().trim();
  }
  async createRandomEmail() {
    await this.ensureClient();
    const result = await this.req(4);
    const emailData = this.parseEmailData(result);
    return {
      success: true,
      email: emailData,
      uuid: this.config.uuid,
      email_id: this.config.selectedEmailId,
      message: `Random email created: ${emailData.fullEmail}`,
      timestamp: Date.now()
    };
  }
  async createCustomEmail({
    alias,
    domainId = 101,
    ...rest
  }) {
    await this.ensureClient();
    this.state.alias = alias || this.genAlias();
    this.state.domainId = domainId;
    const result = await this.req(5);
    const emailData = this.parseEmailData(result);
    return {
      success: true,
      email: emailData,
      uuid: this.config.uuid,
      email_id: this.config.selectedEmailId,
      message: `Custom email created: ${emailData.fullEmail}`,
      timestamp: Date.now()
    };
  }
  async getMessages({
    uuid,
    email_id,
    knownMessageId = null,
    ...rest
  }) {
    this.config.uuid = uuid;
    this.config.selectedEmailId = email_id;
    const override = knownMessageId ? {
      known_message_id: knownMessageId
    } : {};
    const result = await this.req(0, override);
    const messages = this.parseMessagesData(result);
    return {
      success: true,
      messages: messages,
      count: messages.length,
      hasNewMessages: messages.length > 0,
      uuid: this.config.uuid,
      email_id: this.config.selectedEmailId,
      timestamp: Date.now()
    };
  }
  async getDomains({
    uuid = null,
    ...rest
  }) {
    if (uuid) {
      this.config.uuid = uuid;
    } else {
      await this.ensureClient();
    }
    const result = await this.req(1);
    const domains = this.parseDomainsData(result);
    return {
      success: true,
      domains: domains,
      count: domains.length,
      uuid: this.config.uuid,
      timestamp: Date.now()
    };
  }
  async deleteEmail({
    uuid,
    email_id,
    ...rest
  }) {
    this.config.uuid = uuid;
    this.config.selectedEmailId = email_id;
    const result = await this.req(6);
    return {
      success: true,
      message: "Email deleted successfully",
      uuid: this.config.uuid,
      email_id: this.config.selectedEmailId,
      data: result,
      timestamp: Date.now()
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new TempamailAPI();
  try {
    let result;
    let status = 200;
    switch (action) {
      case "create":
        result = await api.createRandomEmail();
        status = 201;
        break;
      case "custom":
        if (!params.alias) {
          return res.status(400).json({
            success: false,
            error: "Missing 'alias' parameter. Example: { alias: 'myalias', domainId: 101 }"
          });
        }
        result = await api.createCustomEmail(params);
        status = 201;
        break;
      case "messages":
        if (!params.uuid || !params.email_id) {
          return res.status(400).json({
            success: false,
            error: "Missing 'uuid' or 'email_id' parameters. Example: { uuid: 'client-uuid', email_id: 123456 }"
          });
        }
        result = await api.getMessages(params);
        break;
      case "domains":
        result = await api.getDomains(params);
        break;
      case "delete":
        if (!params.uuid || !params.email_id) {
          return res.status(400).json({
            success: false,
            error: "Missing 'uuid' or 'email_id' parameters. Example: { uuid: 'client-uuid', email_id: 123456 }"
          });
        }
        result = await api.deleteEmail(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Use 'create', 'custom', 'messages', 'domains', or 'delete'."
        });
    }
    return res.status(status).json(result);
  } catch (error) {
    console.error(`API Handler Error:`, error.message);
    const status = error.message.includes("HTTP 4") ? 400 : error.message.includes("HTTP 5") ? 500 : 500;
    return res.status(status).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}