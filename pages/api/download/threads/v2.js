import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.baseUrl = "https://www.threads.net/";
    this.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    this.cookies = new Map();
  }
  interceptCookies(headers) {
    if (headers["set-cookie"]) {
      const cookieHeaders = Array.isArray(headers["set-cookie"]) ? headers["set-cookie"] : [headers["set-cookie"]];
      cookieHeaders.forEach(cookieHeader => {
        const [cookie] = cookieHeader.split(";");
        const [name, value] = cookie.trim().split("=");
        if (name && value) this.cookies.set(name, value);
      });
    }
  }
  getCookieString() {
    return Array.from(this.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  async download({
    url
  }) {
    try {
      console.log("🔍 Starting download for:", url);
      const result = await this.getEmbed(url);
      if (result) {
        console.log("✅ Successfully parsed embed data");
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
          cookies: Object.fromEntries(this.cookies)
        };
      }
      return {
        success: false,
        error: "Failed to parse embed data",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Download error:", error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  async getEmbed(url) {
    try {
      const {
        username,
        postId
      } = this.extractIds(url);
      if (!postId) throw new Error("Invalid URL - No post ID found");
      const embedUrl = username ? `${this.baseUrl}${username}/post/${postId}/embed` : `${this.baseUrl}t/${postId}/embed`;
      console.log("📡 Fetching embed:", embedUrl);
      const response = await axios.get(embedUrl, {
        headers: {
          "User-Agent": this.userAgent,
          Cookie: this.getCookieString(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        },
        timeout: 3e4
      });
      this.interceptCookies(response.headers);
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      return this.parseHTML(response.data, url);
    } catch (error) {
      console.error("Embed fetch error:", error.message);
      throw error;
    }
  }
  parseHTML(html, url) {
    const $ = cheerio.load(html);
    return {
      url: url,
      user: {
        username: $(".HeaderContainer .NameContainer span").text().trim(),
        avatar: {
          url: $(".AvatarContainer img").attr("src"),
          alt: $(".AvatarContainer img").attr("alt"),
          dimensions: {
            height: $(".AvatarContainer img").attr("height"),
            width: $(".AvatarContainer img").attr("width")
          }
        },
        facepile: {
          topRight: this.getImageData($(".FacepileTopRight img")),
          left: this.getImageData($(".FacepileLeft img")),
          bottom: this.getImageData($(".FacepileBottom img"))
        }
      },
      content: {
        timestamp: $(".HeaderContainer .Timestamp").text().trim(),
        caption: $(".BodyTextContainer span").text().trim(),
        fullText: $(".TextContentContainer").text().trim(),
        hashtags: this.extractHashtags($(".BodyTextContainer span").text())
      },
      media: this.getMediaData($),
      engagement: this.getEngagementData($),
      metadata: {
        pageTitle: $("title").text().trim(),
        scripts: $("script[src]").map((i, el) => $(el).attr("src")).get(),
        styles: $('link[rel="stylesheet"]').map((i, el) => $(el).attr("href")).get(),
        hasThreadline: $(".ThreadlineContainer").length > 0,
        hasSwirl: $(".Swirl").length > 0
      },
      raw: {
        avatarUrl: $(".AvatarContainer img").attr("src"),
        videoUrl: $(".SingleInnerMediaContainerVideo video source").attr("src"),
        imageUrl: $(".SingleInnerMediaContainer img").attr("src"),
        scriptData: this.extractScriptData($)
      }
    };
  }
  getImageData($img) {
    if (!$img.length) return null;
    return {
      url: $img.attr("src"),
      alt: $img.attr("alt"),
      height: $img.attr("height"),
      width: $img.attr("width")
    };
  }
  getMediaData($) {
    const videoSource = $(".SingleInnerMediaContainerVideo video source");
    const image = $(".SingleInnerMediaContainer img");
    if (videoSource.length) {
      return {
        type: "video",
        url: videoSource.attr("src"),
        attributes: {
          controls: $("video").attr("controls") === "1",
          loop: $("video").attr("loop") === "1"
        },
        container: "SingleInnerMediaContainerVideo"
      };
    } else if (image.length) {
      return {
        type: "image",
        url: image.attr("src"),
        dimensions: {
          height: image.attr("height"),
          width: image.attr("width")
        },
        container: "SingleInnerMediaContainer"
      };
    }
    return {
      type: "unknown",
      url: null
    };
  }
  getEngagementData($) {
    const stats = {};
    const icons = $(".ActionBarIcon");
    icons.each((i, icon) => {
      const $icon = $(icon);
      const count = $icon.find(".ActionBarCount").text().trim();
      const svg = $icon.find("svg").html() || "";
      if (svg.includes('d="M1 7.65954')) {
        stats.likes = {
          count: this.parseCount(count),
          raw: count
        };
      } else if (svg.includes('d="M20.65647,17.00793')) {
        stats.comments = {
          count: this.parseCount(count),
          raw: count
        };
      } else if (svg.includes('d="M19.99805,9.49707')) {
        stats.reposts = {
          count: this.parseCount(count),
          raw: count
        };
      } else if (svg.includes('x1="22" y1="2.9996"')) {
        stats.shares = {
          count: this.parseCount(count),
          raw: count
        };
      }
    });
    return stats;
  }
  parseCount(text) {
    if (!text) return 0;
    if (text.includes("rb")) {
      const num = parseFloat(text.replace(" rb", "").replace(",", "."));
      return Math.round(num * 1e3);
    }
    return parseInt(text.replace(/,/g, "")) || 0;
  }
  extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#[\w\u0590-\u05ff]+/g) || [];
    return hashtags.map(tag => tag.replace("#", ""));
  }
  extractScriptData($) {
    const data = {};
    $("script").each((i, script) => {
      const content = $(script).html();
      if (content) {
        const videoMatch = content.match(/"video_url":"([^"]+)"/);
        const imageMatch = content.match(/"display_url":"([^"]+)"/);
        const userMatch = content.match(/"username":"([^"]+)"/);
        if (videoMatch) data.videoUrl = videoMatch[1].replace(/\\u0026/g, "&");
        if (imageMatch) data.imageUrl = imageMatch[1].replace(/\\u0026/g, "&");
        if (userMatch) data.username = userMatch[1];
      }
    });
    return data;
  }
  extractIds(url) {
    const userMatch = url.match(/threads\.net\/([^\/]+)/);
    const postMatch = url.match(/post\/([^\/]+)/) || url.match(/t\/([^\/]+)/);
    return {
      username: userMatch ? userMatch[1].replace("@", "") : null,
      postId: postMatch ? postMatch[1] : null
    };
  }
  setCookie(name, value) {
    this.cookies.set(name, value);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}