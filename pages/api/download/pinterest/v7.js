import axios from "axios";
import * as cheerio from "cheerio";
import {
  fileTypeFromBuffer
} from "file-type";
import {
  FormData
} from "formdata-node";
import fakeUserAgent from "fake-useragent";
const isUrl = url => url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/, "gi"));
class PinterestDownloader {
  constructor(url) {
    this.url = url;
  }
  async getRedirect() {
    try {
      const response = await axios.get(this.url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      this.url = response.headers.location || this.url;
    } catch (error) {
      this.url = error.response?.headers?.location || this.url;
    }
    return this.url;
  }
  async fetchData() {
    await this.getRedirect();
    try {
      const {
        data
      } = await axios.get("https://www.savepin.app/download.php", {
        params: {
          url: this.url,
          lang: "en",
          type: "redirect"
        }
      });
      return this.parseData(data);
    } catch (error) {
      throw new Error("Error fetching media data: " + error.message);
    }
  }
  parseData(body) {
    const $ = cheerio.load(body);
    const formats = [];
    $("table > tbody > tr").each((_, b) => {
      const link = $(b).find("#submiturl").attr("href");
      if (link) {
        formats.push("https://www.savepin.app/" + link);
      }
    });
    return {
      thumbnail: $("article > figure > p > img").attr("src"),
      description: $("article > div > div > p").text().trim(),
      formats: formats
    };
  }
}
class PinterestSearch {
  constructor(query) {
    this.query = query;
  }
  async fetchData() {
    const {
      data
    } = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/`, {
      params: {
        source_url: `/search/pins/?q=${this.query}`,
        data: JSON.stringify({
          options: {
            isPrefetch: false,
            query: this.query,
            scope: "pins",
            no_fetch_context_on_resource: false
          },
          context: {}
        })
      }
    });
    return data.resource_response.data.results.filter(v => v.images?.orig).map(result => ({
      upload_by: result.pinner.username,
      fullname: result.pinner.full_name,
      followers: result.pinner.follower_count,
      caption: result.grid_title,
      image: result.images.orig.url,
      source: "https://id.pinterest.com/pin/" + result.id
    }));
  }
}
class PinterestReverse {
  constructor(imageUrl) {
    this.imageUrl = imageUrl;
  }
  async fetchData() {
    const {
      data: buffer
    } = await axios.get(this.imageUrl, {
      responseType: "arraybuffer"
    });
    const {
      ext
    } = await fileTypeFromBuffer(buffer);
    const base64Image = `data:image/${ext};base64,${buffer.toString("base64")}`;
    const form = new FormData();
    form.append("image", base64Image);
    form.append("x", "0");
    form.append("y", "0");
    form.append("w", "1");
    form.append("h", "1");
    form.append("base_scheme", "https");
    const {
      data
    } = await axios.put("https://api.pinterest.com/v3/visual_search/extension/image/", form, {
      headers: {
        "User-Agent": fakeUserAgent()
      }
    });
    return data;
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      url,
      query,
      image_url
    } = req.body || req.query;
    if (!action) {
      return res.status(400).json({
        error: "Missing action parameter."
      });
    }
    let result;
    switch (action) {
      case "download":
        if (!url) return res.status(400).json({
          error: "Missing URL parameter."
        });
        const downloader = new PinterestDownloader(url);
        result = await downloader.fetchData();
        break;
      case "search":
        if (!query) return res.status(400).json({
          error: "Missing query parameter."
        });
        const search = new PinterestSearch(query);
        result = await search.fetchData();
        break;
      case "reverse":
        if (!image_url) return res.status(400).json({
          error: "Missing image_url parameter."
        });
        const reverse = new PinterestReverse(image_url);
        result = await reverse.fetchData();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action parameter."
        });
    }
    return res.json(result);
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}