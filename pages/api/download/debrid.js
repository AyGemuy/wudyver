import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import axios from "axios";
class Debrid {
  constructor() {
    this.providers = ["https://maxdebrid.com", "https://www.hotdebrid.com", "https://okdebrid.com", "https://anydebrid.com", "https://youdebrid.com", "https://debridhub.com"];
    this.provider = null;
    this.jar = new CookieJar();
    this.decryptedData = null;
    this.client = null;
  }
  setup(providerIndex) {
    if (providerIndex < 1 || providerIndex > this.providers.length) {
      const providerList = this.providers.map((p, i) => `${i + 1}. ${p}`).join("\n");
      throw new Error(`Provider harus 1-${this.providers.length}:\n${providerList}`);
    }
    const index = providerIndex - 1;
    this.provider = this.providers[index];
    const axiosInstance = axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: this.provider,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.provider}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client = wrapper(axiosInstance);
    console.log(`Using provider #${providerIndex}: ${this.provider}`);
  }
  async decryptLang() {
    console.log("Getting lang data...");
    try {
      const res = await this.client.get(this.provider);
      let html = res?.data || "";
      html = html.replace(/<\/script>\s*<script>/gi, "");
      const d = html.match(/var\s+_0xd4t4\s*=\s*['"]([^'"]+)['"]/)?.[1];
      const k = html.match(/var\s+_0xk3y\s*=\s*['"]([^'"]+)['"]/)?.[1];
      const n = html.match(/var\s+_0xn0is3\s*=\s*['"]([^'"]+)['"]/)?.[1];
      console.log("Extracted data:", {
        d: d ? `${d.substring(0, 20)}...` : "Not found",
        k: k ? `${k.substring(0, 20)}...` : "Not found",
        n: n || "Not found"
      });
      if (!d || !k || !n) {
        throw new Error("Missing lang components");
      }
      let s = d.substring(8, d.length - 8);
      s = s.split(n).join("");
      s = s.split("").reverse().join("");
      s = Buffer.from(s, "base64").toString("binary");
      s = s.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
      });
      const key = [];
      for (let i = 0; i < k.length; i += 2) {
        key.push(parseInt(k.substr(i, 2), 16));
      }
      let out = "";
      for (let i = 0; i < s.length; i++) {
        out += String.fromCharCode(s.charCodeAt(i) ^ key[i % key.length]);
      }
      const json = JSON.parse(out);
      this.decryptedData = json;
      console.log("Decrypted keys:", Object.keys(json));
      console.log("Lang:", json.lang ? `${json.lang.substring(0, 30)}...` : "Not found");
      return json;
    } catch (error) {
      console.error("Decrypt error:", error.message);
      throw error;
    }
  }
  async initialize() {
    if (!this.decryptedData) {
      await this.decryptLang();
    }
    return this.decryptedData;
  }
  async download({
    url,
    provider = 1,
    ...rest
  }) {
    console.log(`Processing: ${url}`);
    try {
      this.setup(provider);
      const data = await this.initialize();
      if (!data?.lang) {
        throw new Error("Failed to get lang from decrypted data");
      }
      const apiUrl = `${this.provider}/api?mode=plg&token=${data.token || "__"}`;
      const payload = new URLSearchParams();
      payload.append("link", url);
      payload.append("lang", data.lang);
      payload.append("chck", data.chck || ",");
      payload.append("chck2", data.chck2 || ",");
      if (data.mode === "plg") {
        payload.append("mode", "plg");
      }
      console.log("Sending API request to:", apiUrl);
      console.log("Payload:", Object.fromEntries(payload));
      const apiRes = await this.client.post(apiUrl, payload.toString());
      console.log("API Response:", apiRes.data);
      const response = apiRes?.data || {};
      if (response.error_code) {
        const errorMsg = data[`code_${response.error_code}`] || `Error code: ${response.error_code}`;
        console.error("API Error:", errorMsg);
        if (response.error_code === 3) {
          return await this.alternativeDownload(url, data);
        }
        throw new Error(errorMsg);
      }
      if (!response?.link) {
        console.log("Response:", response);
        throw new Error("No link in response");
      }
      const decodedLink = Buffer.from(response.link, "base64").toString("utf-8");
      console.log("Decoded link:", decodedLink);
      const urlObj = new URL(decodedLink);
      const dlId = urlObj.searchParams.get("id");
      const ticket = response.ticket;
      const next = response.next;
      if (!dlId || !ticket) {
        throw new Error("Missing download parameters");
      }
      console.log("Download ID:", dlId);
      console.log("Ticket:", ticket);
      console.log("Next:", next);
      const dlForm = new URLSearchParams();
      dlForm.append("ticket", ticket);
      if (next) {
        dlForm.append("next", next);
      }
      if (response.lockr) {
        dlForm.append("lockr", "1");
      }
      console.log("Requesting final download...");
      const dlRes = await this.client.post(`${this.provider}/dl?id=${dlId}`, dlForm.toString(), {
        maxRedirects: 0,
        validateStatus: status => status < 400,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          referer: `${this.provider}/`
        }
      });
      const finalUrl = dlRes?.headers?.location;
      console.log("Final URL:", finalUrl || "No redirect");
      if (!finalUrl) {
        const body = dlRes.data;
        if (body && typeof body === "object" && body.download) {
          return {
            success: true,
            name: response.name || "Unknown",
            size: response.size || "0",
            host: response.host || "usersdrive",
            download: body.download,
            provider: this.provider
          };
        }
        throw new Error("No download URL obtained");
      }
      return {
        success: true,
        name: response.name || "Unknown",
        size: response.size || "0",
        host: response.host || "usersdrive",
        download: finalUrl,
        provider: this.provider
      };
    } catch (error) {
      console.error("Download error:", error.message);
      if (error.response) {
        console.log("Response status:", error.response.status);
        console.log("Response data:", error.response.data);
      }
      throw error;
    }
  }
  async alternativeDownload(url, data) {
    console.log("Trying alternative download method...");
    try {
      const apiUrl = `${this.provider}/api?token=${data.token || "__"}`;
      const payload = new URLSearchParams();
      payload.append("link", url);
      payload.append("lang", data.lang);
      payload.append("chck", data.chck || ",");
      payload.append("chck2", data.chck2 || ",");
      console.log("Alternative API request to:", apiUrl);
      const apiRes = await this.client.post(apiUrl, payload.toString());
      const response = apiRes.data;
      console.log("Alternative Response:", response);
      if (response.error_code) {
        throw new Error(`Alternative failed: ${data[`code_${response.error_code}`] || "Unknown error"}`);
      }
      if (response.link) {
        if (response.link.startsWith("http")) {
          return {
            success: true,
            name: response.name || "Unknown",
            size: response.size || "0",
            host: response.host || "usersdrive",
            download: response.link,
            provider: this.provider
          };
        }
        const decodedLink = Buffer.from(response.link, "base64").toString("utf-8");
        return {
          success: true,
          name: response.name || "Unknown",
          size: response.size || "0",
          host: response.host || "usersdrive",
          download: decodedLink,
          provider: this.provider
        };
      }
      throw new Error("No link in alternative response");
    } catch (error) {
      console.error("Alternative download error:", error.message);
      throw error;
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
  const api = new Debrid();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}