import axios from "axios";
import * as cheerio from "cheerio";
const baseURL = "https://aigirl.one";
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
  }
});
class AiGirl {
  constructor() {
    this.endpoint = "/api/v1.1/messages";
    this.searchPath = "/en/?searchQuery=";
  }
  async chat({
    prompt,
    model
  } = {}) {
    const finalPrompt = prompt ? prompt : "say hello";
    const finalModel = model ? model : 4337;
    try {
      const {
        data
      } = await axiosInstance.post(this.endpoint, {
        message: finalPrompt,
        assistantId: finalModel
      });
      return data && data.get && data.get("message") || data;
    } catch (error) {
      return {
        error: true,
        message: error.message
      };
    }
  }
  async search({
    query,
    limit
  } = {}) {
    const finalQuery = query ? query : "yuri";
    const finalLimit = limit ? limit : 10;
    try {
      const {
        data
      } = await axiosInstance.get(this.searchPath + encodeURIComponent(finalQuery));
      const $ = cheerio.load(data);
      const assistants = $("section.row a.assistant-holder").slice(0, finalLimit).get();
      const results = await Promise.all(assistants.map(async el => {
        const $el = $(el);
        const href = $el.attr("href");
        const title = $el.find("h3").text().trim() || "No Title";
        const description = $el.find(".assistant-place-btn > div").eq(1).text().trim() || "No Description";
        const image = $el.find("img").attr("src") || "";
        const tags = [];
        $el.find(".badge").each((_, tag) => {
          tags.push($(tag).text().trim());
        });
        let assistantId = null;
        let meta = {};
        if (href) {
          try {
            const {
              data: profileData
            } = await axiosInstance.get(href);
            const $profile = cheerio.load(profileData);
            assistantId = $profile(".btn.btn-sm.px-2.p-1.mt-1.float-right.reaction[data-assistant]").attr("data-assistant")?.trim();
            const importantMetaKeys = ["description", "og:title", "og:description", "og:image", "og:url", "og:type"];
            $profile("meta").each((_, metaEl) => {
              const $meta = $(metaEl);
              const name = $meta.attr("name");
              const property = $meta.attr("property");
              const content = $meta.attr("content");
              const key = name || property;
              if (key && content && importantMetaKeys.includes(key)) {
                const metaKeyWithoutColon = key.startsWith("og:") ? key.substring(3) : key;
                meta[metaKeyWithoutColon] = content.trim();
              }
            });
          } catch (profileError) {
            console.error(`Error fetching profile for ${href}:`, profileError.message);
          }
        }
        return {
          model: assistantId,
          title: title.trim(),
          description: $el.find(".assistant-place-btn > div").eq(1).text().trim() || "No Description",
          href: baseURL + href,
          image: $el.find("img").attr("src") || "",
          tags: tags,
          meta: meta
        };
      }));
      return {
        success: true,
        body: results
      };
    } catch (error) {
      return {
        error: true,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const client = new AiGirl();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}