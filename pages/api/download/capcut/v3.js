import axios from "axios";
import * as cheerio from "cheerio";
class CapCutDL {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    };
  }
  async getId(url) {
    try {
      const res = await axios.get(url, {
        headers: this.headers,
        maxRedirects: 5
      });
      const redirectedUrl = res.request.res.responseUrl;
      if (redirectedUrl) {
        const idStart = redirectedUrl.lastIndexOf("/") + 1;
        const id = redirectedUrl.substring(idStart);
        return id;
      }
      return null;
    } catch (err) {
      console.error("Error getting ID:", err);
      return null;
    }
  }
  async getMeta(url) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        maxRedirects: 5
      });
      const $ = cheerio.load(data);
      let metaData = null;
      $("script").each((_, el) => {
        const scriptText = $(el).html();
        if (scriptText?.includes("window._ROUTER_DATA")) {
          const jsonStr = scriptText.substring(scriptText.indexOf("{"), scriptText.lastIndexOf("}") + 1);
          try {
            metaData = JSON.parse(jsonStr);
            return false;
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      });
      const template = metaData?.loaderData?.["template-detail_$"]?.templateDetail;
      if (template?.videoUrl) {
        return {
          title: template.title,
          desc: template.desc,
          like: template.likeAmount,
          play: template.playAmount,
          duration: template.templateDuration,
          usage: template.usageAmount,
          createTime: template.createTime,
          coverUrl: template.coverUrl,
          videoRatio: template.videoRatio,
          author: template.author
        };
      } else {
        throw new Error("Video URL not found");
      }
    } catch (err) {
      console.error("Error fetching CapCut Meta:", err);
      throw err;
    }
  }
  async getData(id) {
    try {
      const response = await axios.get(`https://www.capcut.com/templates/${id}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      let videoData = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        const scriptText = $(el).html();
        try {
          videoData = JSON.parse(scriptText);
          return false;
        } catch (e) {
          console.error("Error parsing video data:", e);
        }
      });
      if (videoData) {
        delete videoData["@context"];
        delete videoData["@type"];
      }
      return videoData || {};
    } catch (err) {
      console.error("Error fetching video data:", err);
      throw err;
    }
  }
  async download({
    url
  }) {
    try {
      const id = await this.getId(url);
      if (!id) throw new Error("ID not found");
      const data = await this.getData(id);
      const meta = await this.getMeta(url);
      return {
        ...data,
        ...meta
      };
    } catch (err) {
      console.error("Download failed:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new CapCutDL();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}