import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class BareClubGenerator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://bare.club/api/inout"
    });
    this.tempMailClient = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
    this.cookies = {};
    this.client.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieStr => {
          const firstPart = cookieStr.split(";")[0];
          const [name, ...valueParts] = firstPart.split("=");
          if (name && valueParts.length > 0) {
            this.cookies[name.trim()] = valueParts.join("=").trim();
          }
        });
      }
      return response;
    }, error => {
      if (error.response && error.response.headers && error.response.headers["set-cookie"]) {
        const setCookieHeader = error.response.headers["set-cookie"];
        setCookieHeader.forEach(cookieStr => {
          const firstPart = cookieStr.split(";")[0];
          const [name, ...valueParts] = firstPart.split("=");
          if (name && valueParts.length > 0) {
            this.cookies[name.trim()] = valueParts.join("=").trim();
          }
        });
      }
      return Promise.reject(error);
    });
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://bare.club",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://bare.club/generate",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  buildHeaders(additionalHeaders = {}) {
    const headers = {
      ...this.defaultHeaders
    };
    const cookieParts = [];
    for (const name in this.cookies) {
      cookieParts.push(`${name}=${this.cookies[name]}`);
    }
    if (cookieParts.length > 0) {
      headers["Cookie"] = cookieParts.join("; ");
    }
    return {
      ...headers,
      ...additionalHeaders
    };
  }
  async _createTempEmail() {
    try {
      console.log("Creating temporary email...");
      const response = await this.tempMailClient.get("", {
        params: {
          action: "create"
        }
      });
      if (response.data && response.data.email) {
        console.log(`Temporary email created: ${response.data.email}`);
        return response.data.email;
      } else {
        throw new Error("Failed to create temporary email or email not in response.");
      }
    } catch (error) {
      console.error("Error creating temporary email:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async _sendLoginLink(email) {
    try {
      console.log(`Sending login link to ${email}...`);
      const encodedEmail = encodeURIComponent(email);
      const url = `/login/send_email_link?email=${encodedEmail}`;
      await this.client.post(url, null, {
        headers: this.buildHeaders({
          "content-length": "0"
        })
      });
      console.log("Login link sent successfully.");
    } catch (error) {
      console.error("Error sending login link:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  _extractLoginLink(html_content) {
    const $ = cheerio.load(html_content);
    const linkElement = $(`a[href^="https://bare.club/api/inout/login/"]`).first();
    if (linkElement.length > 0) {
      const potentialLink = linkElement.attr("href");
      if (potentialLink && potentialLink.length > "https://bare.club/api/inout/login/".length) {
        return potentialLink;
      }
    }
    return null;
  }
  async _getLoginLinkFromEmail(tempEmail, maxAttempts = 15, pollInterval = 3e3) {
    console.log(`Polling for login email at ${tempEmail}...`);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.tempMailClient.get("", {
          params: {
            action: "message",
            email: tempEmail
          }
        });
        if (response.data && response.data.data && response.data.data.length > 0) {
          for (const mail of response.data.data) {
            if (mail.html_content) {
              const loginLink = this._extractLoginLink(mail.html_content);
              if (loginLink) {
                console.log(`Login link found: ${loginLink}`);
                return loginLink;
              }
            }
          }
        }
        console.log(`Attempt ${i + 1}/${maxAttempts}: Email not found or login link not in email. Retrying in ${pollInterval / 1e3}s...`);
      } catch (error) {
        console.error(`Error polling email (attempt ${i + 1}):`, error.response ? error.response.data : error.message);
      }
      await delay(pollInterval);
    }
    throw new Error("Failed to retrieve login link from email after multiple attempts.");
  }
  async _confirmLogin(verificationLink) {
    try {
      console.log(`Attempting to confirm login by visiting: ${verificationLink}`);
      const urlToVisit = verificationLink.startsWith(this.client.defaults.baseURL) ? verificationLink.substring(this.client.defaults.baseURL.length) : verificationLink;
      await this.client.get(urlToVisit, {
        headers: this.buildHeaders(),
        maxRedirects: 0,
        validateStatus: function(status) {
          return status >= 200 && status < 400;
        }
      });
      console.log("Login confirmation request sent. Cookies should be set if successful.");
    } catch (error) {
      if (error.response && (error.response.status === 301 || error.response.status === 302 || error.response.status === 303 || error.response.status === 307 || error.response.status === 308)) {
        console.log(`Login confirmation resulted in a redirect (status ${error.response.status}), which is often expected. Cookies should be set.`);
      } else {
        console.error("Error confirming login:", error.response ? error.response.data : error.message, error.config);
        throw error;
      }
    }
  }
  async login() {
    try {
      const tempEmail = await this._createTempEmail();
      await this._sendLoginLink(tempEmail);
      const verificationLink = await this._getLoginLinkFromEmail(tempEmail);
      await this._confirmLogin(verificationLink);
      console.log("Login process completed.");
    } catch (error) {
      console.error("Login failed:", error.message);
      throw error;
    }
  }
  _getExtensionFromMimeType(contentType) {
    if (!contentType) return "bin";
    const parts = contentType.split("/");
    const subType = parts[1] || "bin";
    return subType.toLowerCase().split(";")[0].trim();
  }
  async _fetchImageDetails(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"];
      const extension = this._getExtensionFromMimeType(contentType);
      const filename = `image.${extension}`;
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (error) {
      console.error(`Error fetching image details from ${imageUrl}:`, error.message);
      throw error;
    }
  }
  async generate({
    params,
    imageUrl,
    maskUrl = "https://i.pinimg.com/originals/f3/2c/51/f32c516a6bfffba3812d638c88b2216c.jpg"
  }) {
    try {
      if (!imageUrl) {
        throw new Error("imageUrl is required.");
      }
      await this.login();
      console.log("Cookies after login:", this.cookies);
      const formData = new FormData();
      const clothedImageDetails = await this._fetchImageDetails(imageUrl);
      const clothedBlob = new Blob([clothedImageDetails.buffer], {
        type: clothedImageDetails.contentType
      });
      formData.append("clothed", clothedBlob, clothedImageDetails.filename);
      if (maskUrl) {
        const maskImageDetails = await this._fetchImageDetails(maskUrl);
        const maskBlob = new Blob([maskImageDetails.buffer], {
          type: maskImageDetails.contentType
        });
        formData.append("mask", maskBlob, maskImageDetails.filename);
      }
      const queryParams = new URLSearchParams(params).toString();
      const url = `/wishes?${queryParams}`;
      console.log("Submitting generation request...");
      const response = await this.client.post(url, formData, {
        headers: this.buildHeaders(formData.headers)
      });
      if (!response.data.wid) {
        throw new Error("Wish ID (wid) not found in the initial response for generation.");
      }
      console.log(`Generation initiated. WID: ${response.data.wid}`);
      return await this._pollForResult(response.data.wid);
    } catch (error) {
      console.error("Error in generateImage:", error.response ? error.response.data : error.message);
      if (error.response && error.response.data && error.response.data.error) {
        console.error("API Error details during generation:", error.response.data.error);
      }
      throw error;
    }
  }
  async _pollForResult(wishId, interval = 3e3, maxAttempts = 60) {
    const pollUrl = `/wishes/${wishId}`;
    console.log(`Polling for generation result (WID: ${wishId})...`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get(pollUrl, {
          headers: this.buildHeaders()
        });
        console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for WID ${wishId}: Status - ${response.data.status}, Naked URL - ${response.data.naked ? "Available" : "Not yet"}`);
        if (response.data.status === "done" && response.data.naked) {
          return response.data;
        } else if (response.data.error) {
          throw new Error(`Polling generation failed for WID ${wishId}: ${response.data.error} (Type: ${response.data.error_type})`);
        }
        await delay(interval);
      } catch (error) {
        console.error(`Error polling generation (attempt ${attempt + 1} for WID ${wishId}):`, error.response ? error.response.data : error.message);
        if (attempt === maxAttempts - 1) throw error;
        await delay(interval);
      }
    }
    throw new Error(`Polling generation timed out for WID ${wishId} after maximum attempts.`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    if (!params.imageUrl) {
      return res.status(400).json({
        error: "imageUrl is required"
      });
    }
    const generator = new BareClubGenerator();
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during image generation request",
      details: error.message || error
    });
  }
}