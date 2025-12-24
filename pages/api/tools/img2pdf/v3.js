import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class ImageConverterMkII {
  constructor(orbitalAddress = "https://imagetopdf.com/") {
    this.orbitalAddress = orbitalAddress;
    this.commsLog = {};
    this.networkInterface = axios.create({
      baseURL: this.orbitalAddress,
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: this.orbitalAddress,
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: this.orbitalAddress,
        "Sec-Ch-Ua": '"HyperOS";v="1.0", "Chromium";v="120", "Not?A=Brand";v="8"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      }
    });
    this.networkInterface.interceptors.response.use(this.updateSession.bind(this));
    this.sessionId = null;
    this.processedFiles = {};
    this.sessionProtocol = {};
  }
  log(module, message, ...details) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${module}] ${message} ${details.length > 0 ? JSON.stringify(details) : ""}`;
    console.log(logEntry);
    this.commsLog[timestamp] = logEntry;
  }
  generateId(length = 16, prefix = "") {
    let id = "";
    while (id.length < length) {
      id += Math.random().toString(36).substring(2, 15);
    }
    return prefix + id.substring(0, length);
  }
  updateSession(response) {
    (response.headers["set-cookie"] || []).forEach(cookieString => {
      const [name, value] = cookieString.split(";")[0].split("=");
      this.sessionProtocol[name] = value;
    });
    return response;
  }
  async establishConnection() {
    try {
      const response = await this.networkInterface.get("/");
      this.networkInterface.interceptors.response.handlers[0].fulfilled(response);
      this.log("Comms", "Connection OK", this.sessionProtocol);
      return this.sessionProtocol;
    } catch (error) {
      this.log("Comms", "Connection Fail", error.message);
      throw error;
    }
  }
  async sendImage(imageData, imageName, fileIdentifier) {
    try {
      if (!this.sessionId) {
        this.sessionId = this.generateId();
        this.log("Transmit", "Session Start", this.sessionId);
      }
      const uploadEndpoint = `/upload/${this.sessionId}`;
      const payload = new FormData();
      payload.append("file", imageData, imageName);
      payload.append("id", fileIdentifier);
      payload.append("name", imageName);
      payload.append("rnd", Math.random());
      const response = await this.networkInterface.post(uploadEndpoint, payload, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${payload._boundary}`,
          Cookie: Object.entries(this.sessionProtocol).map(([key, value]) => `${key}=${value}`).join("; ")
        }
      });
      if (response.data?.id) {
        this.log("Transmit", "Image OK", imageName, response.data.id);
        return response.data.id;
      } else {
        this.log("Transmit", "Image Error", imageName, response.data);
        throw new Error(`Image send failed for ${imageName}`);
      }
    } catch (error) {
      this.log("Transmit", "Send Error", imageName, error.message);
      throw error;
    }
  }
  async requestConversion(fileId) {
    if (!this.sessionId || !fileId) throw new Error("Session/File ID missing");
    const conversionEndpoint = `/convert/${this.sessionId}/${fileId}/?rnd=${Math.random()}`;
    try {
      const response = await this.networkInterface.get(conversionEndpoint, {
        headers: {
          ...this.networkInterface.defaults.headers.get,
          Cookie: Object.entries(this.sessionProtocol).map(([key, value]) => `${key}=${value}`).join("; ")
        }
      });
      if (response.data?.status === "success") {
        this.log("Convert", "Request OK", fileId);
        return response.data;
      } else {
        this.log("Convert", "Request Fail", fileId, response.data);
        return null;
      }
    } catch (error) {
      this.log("Convert", "Request Error", fileId, error.message);
      return null;
    }
  }
  async checkStatus(fileId) {
    if (!this.sessionId || !fileId) throw new Error("Session/File ID missing");
    const statusEndpoint = `/status/${this.sessionId}/${fileId}`;
    try {
      const response = await this.networkInterface.get(statusEndpoint, {
        headers: {
          ...this.networkInterface.defaults.headers.get,
          Cookie: Object.entries(this.sessionProtocol).map(([key, value]) => `${key}=${value}`).join("; ")
        }
      });
      if (response.data?.status === "success" && response.data?.convert_result) {
        this.log("Status", "Convert Done", fileId, response.data.convert_result);
        return response.data;
      } else {
        this.log("Status", "Convert Wait", fileId, response.data?.status);
        return response.data;
      }
    } catch (error) {
      this.log("Status", "Status Error", fileId, error.message);
      return null;
    }
  }
  async processImage(imageURL) {
    const filename = imageURL.substring(imageURL.lastIndexOf("/") + 1);
    const localFileId = this.generateId(26, "file_");
    try {
      this.log("Process", "Start Image", filename, localFileId);
      const imageResponse = await this.networkInterface.get(imageURL, {
        responseType: "arraybuffer"
      });
      const imageBlob = new Blob([imageResponse.data]);
      const uploadedId = await this.sendImage(imageBlob, filename, localFileId);
      if (uploadedId) {
        const conversionData = await this.requestConversion(uploadedId);
        if (conversionData?.status === "success") {
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2e3));
            const statusData = await this.checkStatus(uploadedId);
            if (statusData?.status === "success" && statusData?.convert_result) {
              this.processedFiles[uploadedId] = statusData.convert_result;
              this.log("Process", "Image Ready", filename, uploadedId, statusData.convert_result);
              return true;
            }
          }
          this.log("Process", "Convert Timeout", filename);
          return false;
        } else {
          this.log("Process", "Convert Fail", filename, conversionData);
          return false;
        }
      }
      return false;
    } catch (error) {
      this.log("Process", "Image Error", filename, error.message);
      return false;
    }
  }
  async buildPdf(imageURLs) {
    try {
      await this.establishConnection();
      this.processedFiles = {};
      this.sessionId = this.generateId();
      this.log("Assemble", "Start Build", this.sessionId, imageURLs.length + " images");
      for (const imageURL of imageURLs) {
        await this.processImage(imageURL);
      }
      const successfulFiles = Object.keys(this.processedFiles);
      if (successfulFiles.length > 0) {
        const orderParamenter = successfulFiles.join(",");
        const downloadEndpoint = `${this.orbitalAddress}all/${this.sessionId}/imagetopdf.pdf?order=${orderParamenter}&rnd=${Math.random()}`;
        this.log("Assemble", "Download Link", downloadEndpoint);
        return downloadEndpoint;
      } else {
        this.log("Assemble", "No Files Assembled");
        return null;
      }
    } catch (error) {
      this.log("Assemble", "Build Error", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  let imageUrls;
  if (req.method === "GET") {
    const {
      images
    } = req.method === "GET" ? req.query : req.body;
    if (!images) {
      return res.status(400).json({
        error: "No image URLs provided"
      });
    }
    imageUrls = images.split(",").map(url => url.trim());
  } else if (req.method === "POST") {
    imageUrls = Array.isArray(req.body?.images) ? req.body.images : [req.body?.images];
  }
  try {
    const converterMkII = new ImageConverterMkII();
    const downloadLink = await converterMkII.buildPdf(imageUrls);
    return res.status(200).json({
      url: downloadLink
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}