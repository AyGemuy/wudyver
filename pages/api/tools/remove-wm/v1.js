import axios from "axios";
class TextWatermarkRemover {
  constructor() {
    this.baseUrl = "https://www.x-design.com/api/v1";
    this.clientId = "1200000018";
    this.appId = "2000010";
    this.countryCode = "ID";
    this.gnum = this.generateGnum();
    this.mtccClient = this.generateMtccClient();
    this.cdnBase = "https://x-design-release.stariicloud.com";
  }
  generateGnum() {
    const t = Date.now().toString(16);
    const r = Math.random().toString(16).substring(2, 15);
    return `${t}-${r}-b457455-412898-${t}${r.substring(0, 5)}`;
  }
  generateMtccClient() {
    const data = {
      app_id: this.appId,
      os_type: "web",
      country_code: this.countryCode,
      gnum: this.gnum,
      function: {
        name: "00107"
      },
      position: {
        level1: "00107"
      },
      media_type: "photo",
      res_media_type: "photo",
      ext_info: {
        biz_type: "",
        virtual_id: "2"
      },
      uid: ""
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  generateRandomId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async processTextRemoval(imageUrl, automatic = true) {
    try {
      const url = `${this.baseUrl}/mtlab/eraser_watermark_v2_async?save_to_own_bucket=ai_eliminate&client_id=${this.clientId}&gid=${this.gnum}&client_language=en&channel=&country_code=${this.countryCode}&ts_random_id=${this.generateRandomId()}`;
      const payload = {
        media_info_list: [{
          media_data: imageUrl,
          media_profiles: {
            media_data_type: "url"
          }
        }],
        parameter: {
          automatic: automatic,
          requester: "design_studio",
          target: "text",
          dilated: true,
          rsp_media_type: "png",
          rgb_mask: true,
          return_translucent: false
        }
      };
      const res = await axios.post(url, payload, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Origin: "https://www.x-design.com",
          Referer: "https://www.x-design.com/object-remover/edit",
          "x-mtcc-client": this.mtccClient
        }
      });
      return res?.data?.data?.msg_id;
    } catch (err) {
      console.error("Error in processTextRemoval:", err.message);
      throw err;
    }
  }
  async queryProcessingStatus(msgId) {
    try {
      const url = `${this.baseUrl}/mtlab/query_multi?msg_ids=${msgId}&client_id=${this.clientId}&gid=${this.gnum}&client_language=en&channel=&country_code=${this.countryCode}&ts_random_id=${this.generateRandomId()}`;
      const res = await axios.get(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          Origin: "https://www.x-design.com",
          Referer: "https://www.x-design.com/object-remover/edit"
        }
      });
      return res?.data?.data?.[0];
    } catch (err) {
      console.error("Error in queryProcessingStatus:", err.message);
      throw err;
    }
  }
  async waitForCompletion(msgId, maxAttempts = 30, interval = 2e3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.queryProcessingStatus(msgId);
        if (result?.process === 1 && result?.err_code === 0) {
          const path = result?.media_info_list?.[0]?.media_data;
          return path?.startsWith("http") ? path : `${this.cdnBase}${path}`;
        } else if (result?.err_code && result?.err_code !== 0) {
          throw new Error(`Processing failed: ${result?.err}`);
        }
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err.message);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("Processing timeout - maximum attempts reached");
  }
  async validateImageUrl(imageUrl) {
    try {
      const res = await axios.head(imageUrl);
      const type = res?.headers?.["content-type"];
      if (!type?.startsWith("image/")) throw new Error("URL does not point to a valid image");
      return true;
    } catch (err) {
      console.error("Error in validateImageUrl:", err.message);
      throw err;
    }
  }
  async removeTextWatermark({
    imageUrl,
    automatic = true
  }) {
    try {
      if (typeof imageUrl !== "string" || !imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
        throw new Error("Invalid image URL. Expected a valid HTTP/HTTPS URL string.");
      }
      console.log("Validating image URL...");
      await this.validateImageUrl(imageUrl);
      console.log("Starting text removal processing...");
      const msgId = await this.processTextRemoval(imageUrl, automatic);
      console.log("Processing image... This may take a few moments.");
      const resultUrl = await this.waitForCompletion(msgId);
      console.log("Processing complete!");
      return resultUrl;
    } catch (err) {
      console.error("Error in removeTextWatermark:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const remover = new TextWatermarkRemover();
    const response = await remover.removeTextWatermark(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}