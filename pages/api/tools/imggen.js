import fetch from "node-fetch";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import chalk from "chalk";
class ImgGen {
  constructor() {
    this.baseUrl = "https://api.imggen.ai";
    this.endpoints = {
      generate: "/guest-generate-image",
      watchProcess: "/guest-watch-process",
      upload: "/guest-upload",
      upscaleImage: "/guest-upscale-image",
      backgroundRemover: "/guest-background-remover",
      removeText: "/guest-remove-text",
      watermarkRemover: "/guest-watermark-remover",
      retouchPhoto: "/guest-retouch-photo",
      sharpenPhoto: "/guest-sharpen-photo",
      unblurImage: "/guest-unblur-image",
      imageRestoration: "/guest-image-restoration",
      colorCorrection: "/guest-image-color-correction",
      personalizedImage: "/guest-generate-personalized-image",
      headshot: "/guest-generate-headshot"
    };
  }
  log(message, type = "info") {
    const colors = {
      info: "blue",
      success: "green",
      error: "red",
      warn: "yellow"
    };
    console.log(chalk[colors[type]](message));
  }
  addDomain(obj, domain = this.baseUrl) {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      acc[k] = Array.isArray(v) ? v.map(x => x.startsWith("/") ? domain + x : x) : typeof v === "string" && v.startsWith("/") ? domain + v : typeof v === "object" ? this.addDomain(v, domain) : v;
      return acc;
    }, {});
  }
  async fetchData(url, options) {
    try {
      this.log(`Fetching from ${url}`, "info");
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`${res.statusText} - ${await res.text()}`);
      this.log("Fetch successful", "success");
      return res.json();
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }
  async getStatus(uuid) {
    return this.fetchData(`${this.baseUrl}${this.endpoints.watchProcess}/${uuid}`, {
      method: "GET"
    });
  }
  async gen(prompt) {
    try {
      const res = await this.fetchData(`${this.baseUrl}${this.endpoints.generate}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });
      const startTime = Date.now();
      const timeout = 6e4;
      while (Date.now() - startTime < timeout) {
        this.log("Checking status...", "info");
        await new Promise(r => setTimeout(r, 5e3));
        const result = await this.getStatus(res.uuid);
        if (result.images.length) return this.addDomain(result, this.baseUrl);
      }
      throw new Error("Processing timed out or failed");
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }
  async createFormData(imageBuffer) {
    try {
      const {
        ext = "jpg",
          mime = "image/jpeg"
      } = await fileTypeFromBuffer(imageBuffer) || {};
      const formData = new FormData();
      formData.append("image", new Blob([imageBuffer], {
        type: mime
      }), `image.${ext}`);
      this.log("Form data created successfully", "success");
      return formData;
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }
  async upload(imageBuffer) {
    const formData = await this.createFormData(imageBuffer);
    return this.fetchData(`${this.baseUrl}${this.endpoints.upload}`, {
      method: "POST",
      body: formData
    });
  }
  async process(imageBuffer, endpoint, options = {}) {
    try {
      const {
        image: {
          folder_name,
          name,
          extname = "jpg"
        }
      } = await this.upload(imageBuffer);
      const data = {
        image: {
          url: `https://api.imggen.ai/uploads/guest-files/${folder_name}/${name}`,
          name: name,
          original_name: name,
          folder_name: folder_name,
          extname: extname
        },
        ...options
      };
      const res = await fetch(`${this.baseUrl}${this.endpoints[endpoint]}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`${res.statusText} - ${await res.text()}`);
      this.log("Processing request sent successfully", "success");
      return res.json();
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }
  async genImg(imageBuffer, type, options = {}) {
    try {
      const res = await this.process(imageBuffer, type, options);
      const startTime = Date.now();
      const timeout = 6e4;
      while (Date.now() - startTime < timeout) {
        this.log("Polling status...", "info");
        await new Promise(r => setTimeout(r, 5e3));
        if (res.message.includes("successfully")) return this.addDomain(res, this.baseUrl);
      }
      throw new Error("Processing timed out or failed");
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const imgGen = new ImgGen();
  try {
    const {
      type,
      ...options
    } = req.method === "POST" ? req.body : req.query;
    if (!type) return res.status(400).json({
      error: "Type parameter is required"
    });
    if (req.method === "POST") {
      if (!req.body || !req.body.file) return res.status(400).json({
        error: "Invalid input: Buffer expected"
      });
      const buffer = Buffer.from(req.body.file);
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !fileType.mime.startsWith("image/")) return res.status(400).json({
        error: "Invalid file type: Image required"
      });
      const result = await imgGen.genImg(buffer, type, options);
      return res.status(200).json(result);
    } else if (req.method === "GET") {
      const {
        url
      } = req.method === "GET" ? req.query : req.body;
      if (!url) return res.status(400).json({
        error: "URL parameter is required"
      });
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: "Invalid URL format"
        });
      }
      const response = await fetch(url);
      if (!response.ok) return res.status(400).json({
        error: "Unable to fetch image from URL"
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !fileType.mime.startsWith("image/")) return res.status(400).json({
        error: "Invalid file type: Image required"
      });
      const result = await imgGen.genImg(buffer, type, options);
      return res.status(200).json(result);
    } else {
      res.setHeader("Allow", ["POST", "GET"]);
      return res.status(405).json({
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}