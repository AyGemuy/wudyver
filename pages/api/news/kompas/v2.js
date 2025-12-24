import axios from "axios";
class KompasScraper {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "https://api.kompas.com/apps";
    this.recUrl = config.recUrl || "https://recommendation.kgdata.dev/rec/kompascom/api/v2";
    this.headers = {
      "User-Agent": "kompascom-android",
      "Accept-Encoding": "gzip",
      ...config.headers
    };
    this.timeout = config.timeout || 1e4;
    this.client = axios.create({
      headers: this.headers,
      timeout: this.timeout
    });
  }
  async execute({
    action = "latest",
    page = 1,
    limit = 20,
    guid,
    pageUrl,
    ...rest
  } = {}) {
    try {
      console.log(`🔄 [Kompas] Starting ${action.toUpperCase()}...`);
      let result;
      switch (action) {
        case "latest":
          result = await this.getLatest({
            page: page,
            limit: limit,
            ...rest
          });
          break;
        case "detail":
          this.validateGuid(guid);
          result = await this.getDetail({
            guid: guid,
            ...rest
          });
          break;
        case "related":
          this.validateUrl(pageUrl);
          result = await this.getRelated({
            pageUrl: pageUrl,
            limit: limit,
            ...rest
          });
          break;
        case "flow":
          this.validateGuid(guid);
          result = await this.getFlow({
            guid: guid,
            page: page,
            limit: limit,
            ...rest
          });
          break;
        default:
          throw new Error(`Invalid action: ${action}. Use: latest|detail|related|flow`);
      }
      console.log(`✅ [Kompas] ${action.toUpperCase()} SUCCESS (${result.length || 1} items)`);
      return result;
    } catch (error) {
      console.error(`❌ [Kompas] ${action.toUpperCase()} FAILED:`, error.message);
      throw error;
    }
  }
  validateGuid(guid) {
    if (!guid) throw new Error("GUID is required");
  }
  validateUrl(url) {
    if (!url) throw new Error("Page URL is required");
  }
  processAuthor(data = {}) {
    return {
      id: data.id || null,
      name: data.name || "N/A",
      jobTitle: data.jobtitle?.trim() || ""
    };
  }
  processSummary(data = {}) {
    return {
      guid: data.guid || "",
      title: data.title || "No Title",
      url: data.url || "",
      imageUrl: data.image || data.img || "",
      channel: data.channel || "N/A",
      section: data.section || "N/A",
      publishedDate: data.date ? new Date(data.date) : null
    };
  }
  processArticle(rawData, guid) {
    const article = {
      guid: guid,
      title: rawData.title || "No Title",
      url: rawData.urlpage || "",
      description: rawData.description || "",
      channel: rawData.kanal || "N/A",
      tags: rawData.tags || [],
      publishedDate: new Date(rawData.date),
      author: this.processAuthor(rawData.author),
      editor: this.processAuthor(rawData.editor),
      images: this.processMedia(rawData.photoblock),
      videos: this.processMedia(rawData.videoblock)
    };
    const {
      html,
      text
    } = this.processContent(rawData.content, article.videos);
    article.contentHtml = html;
    article.contentText = text;
    return article;
  }
  processMedia(mediaBlock = []) {
    return mediaBlock.map(item => ({
      url: item.block,
      author: item.author || null,
      caption: item.caption || null,
      order: parseInt(item.orderid, 10)
    }));
  }
  processContent(contentArray = [], videos) {
    let html = contentArray.map(str => {
      if (str.includes("[video.1]")) {
        const videoUrl = videos[0]?.url;
        return videoUrl ? `<p><strong>[Video]</strong> <a href="${videoUrl}" target="_blank">${videoUrl}</a></p>` : "";
      }
      return str;
    }).join("");
    let text = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n").replace(/<li[^>]*>/gi, "\n* ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").split("\n").map(line => line.trim()).join("\n").trim();
    return {
      html: html,
      text: text
    };
  }
  async getLatest({
    page = 1,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.client.get(`${this.baseUrl}/home?pages=${page}`, rest);
      return (data.latest || []).slice(0, limit).map(this.processSummary.bind(this));
    } catch (error) {
      throw new Error(`Latest News: ${error.message}`);
    }
  }
  async getDetail({
    guid,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.client.get(`${this.baseUrl}/v1/detail?guid=${guid}`, rest);
      return this.processArticle(data.result, guid);
    } catch (error) {
      throw new Error(`Article Detail: ${error.message}`);
    }
  }
  async getRelated({
    pageUrl,
    limit = 10,
    ...rest
  } = {}) {
    try {
      const payload = {
        pageurl: pageUrl,
        pagetype: "read",
        ukid: ""
      };
      const headers = {
        ...this.headers,
        "Content-Type": "application/json; charset=UTF-8"
      };
      const {
        data
      } = await this.client.post(`${this.recUrl}/recommendation/item`, payload, {
        headers: headers,
        ...rest
      });
      return (data.items || []).slice(0, limit).map(this.processSummary.bind(this));
    } catch (error) {
      throw new Error(`Related Articles: ${error.message}`);
    }
  }
  async getFlow({
    guid,
    page = 1,
    limit = 5,
    ...rest
  } = {}) {
    try {
      const detail = await this.getDetail({
        guid: guid,
        ...rest
      });
      const [latest, related] = await Promise.all([this.getLatest({
        page: page,
        limit: limit,
        ...rest
      }), this.getRelated({
        pageUrl: detail.url,
        limit: limit,
        ...rest
      })]);
      console.log(`✅ [Kompas] FLOW complete: ${latest.length} latest + ${related.length} related`);
      return {
        latest: latest,
        detail: detail,
        related: related
      };
    } catch (error) {
      throw new Error(`Flow: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new KompasScraper();
    const response = await api.execute(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}