import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class OnlineConvert {
  constructor() {
    this.client = axios.create({
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400
    });
  }
  async getHostUrl() {
    try {
      const response = await this.client.get("https://www.onlineconverter.com/get/host", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
          origin: "https://www.onlineconverter.com",
          referer: "https://www.onlineconverter.com/"
        }
      });
      this.hostUrl = response.data;
    } catch (error) {
      console.error("Error fetching host URL:", error);
      throw error;
    }
  }
  async uploadFiles(files, opts) {
    try {
      if (!this.hostUrl) await this.getHostUrl();
      const form = new FormData();
      let index = 0;
      for (const fileBuffer of files) {
        try {
          const blob = new Blob([fileBuffer], {
            type: "image/jpeg"
          });
          const fileNameWithoutExt = index === 0 ? "file" : `file_${index}`;
          const fileNameWithExt = `${fileNameWithoutExt}.jpg`;
          form.append(fileNameWithoutExt, blob, fileNameWithExt);
          index++;
        } catch (error) {
          console.error(`Error processing file ${index}:`, error);
          continue;
        }
      }
      const formOptions = {
        class: opts.class || "tool",
        from: opts.from || "image",
        to: opts.tool || "merge-images-to-video",
        source: opts.source || "online",
        select: opts.mergeTo || "1",
        duration: opts.duration || "1",
        style: opts.style || "0"
      };
      for (const key in formOptions) {
        if (formOptions.hasOwnProperty(key) && formOptions[key] && !key.startsWith("url") && !form.has(key)) {
          form.append(key, formOptions[key]);
        }
      }
      for (const key in opts) {
        if (opts.hasOwnProperty(key) && opts[key] && !key.startsWith("url") && !form.has(key) && !formOptions[key]) {
          form.append(key, opts[key]);
        }
      }
      const uploadResponse = await this.client.post(this.hostUrl, form, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
          "Content-Type": "multipart/form-data",
          origin: "https://www.onlineconverter.com",
          referer: "https://www.onlineconverter.com/"
        }
      });
      const host = new URL(this.hostUrl).origin;
      const filePath = uploadResponse.data.split("/").pop();
      const resultUrl = `${host}/file/${filePath}/download`;
      return {
        result: resultUrl
      };
    } catch (error) {
      console.error("Error uploading files:", error);
      return {
        result: "Error uploading files"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...query
  } = req.method === "POST" ? req.body : req.query;
  const opts = {
    class: query.class,
    from: query.from,
    tool: query.tool || "merge-images-to-video",
    source: query.source,
    mergeTo: query.mergeTo,
    duration: query.duration,
    style: query.style,
    ...query
  };
  let urls = [];
  if (Array.isArray(url)) {
    urls = url;
  } else if (typeof url === "string") {
    urls.push(url);
  }
  for (const key in query) {
    if (query.hasOwnProperty(key) && key.startsWith("url") && key !== "url") {
      urls.push(query[key]);
    }
  }
  if (req.body && req.headers["content-type"] === "application/json") {
    const {
      url: jsonUrls,
      ...jsonOpts
    } = req.body;
    if (Array.isArray(jsonUrls)) {
      urls = urls.concat(jsonUrls);
    }
    Object.assign(opts, jsonOpts);
  }
  if (urls.length === 0) {
    return res.status(400).json({
      error: "No URLs provided"
    });
  }
  const onlineConvert = new OnlineConvert();
  const fileBuffers = [];
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      fileBuffers.push(response.data);
    } catch (error) {
      console.error(`Error fetching image from ${url}:`, error);
      continue;
    }
  }
  if (fileBuffers.length === 0) {
    return res.status(400).json({
      error: "No valid images were fetched"
    });
  }
  try {
    const result = await onlineConvert.uploadFiles(fileBuffers, opts);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}