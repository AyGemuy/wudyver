import axios from "axios";
import crypto from "crypto";
class DesoraClient {
  constructor() {
    this.config = {
      base_url: "https://desora.app/api",
      endpoints: {
        remove: "/remove-watermark"
      },
      headers: {
        "User-Agent": "Android Client",
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    };
    this.fixed_bytes = [139, 245, 90, 231, 172, 32, 69, 180, 186, 108, 81, 142, 102, 181, 143, 228];
  }
  format_uuid(arr) {
    const lengths = [4, 2, 2, 2, 6];
    return lengths.map((len, i, a) => {
      const start = a.slice(0, i).reduce((s, n) => s + n, 0);
      return arr.slice(start, start + len).map(b => b.toString(16).padStart(2, "0")).join("");
    }).join("-");
  }
  generate_uuid() {
    return this.format_uuid(this.fixed_bytes);
  }
  validate_url(url) {
    const url_pattern = /^https:\/\/sora\.chatgpt\.com\/(p\/s_\w+|d\/gen_\w+)$/;
    return url_pattern.test(url?.trim() || "");
  }
  build_payload(url) {
    return {
      appKey: this.generate_uuid(),
      clientType: "ANDROID",
      premium: true,
      query: url,
      userId: crypto.randomUUID()
    };
  }
  build_response(success, code, result) {
    return {
      success: success,
      code: code,
      result: result
    };
  }
  async generate({
    url,
    ...rest
  }) {
    console.log("Starting watermark removal process...");
    if (!url?.trim()) {
      console.log("URL validation failed: empty");
      return this.build_response(false, 400, {
        error: "URL cannot be empty"
      });
    }
    if (!this.validate_url(url)) {
      console.log("URL validation failed: invalid format");
      return this.build_response(false, 422, {
        error: "Invalid URL format. Please provide a valid Sora video link"
      });
    }
    console.log("URL validated, preparing request payload...");
    const payload = this.build_payload(url);
    try {
      console.log("Sending request to API...");
      const response = await axios.post(`${this.config.base_url}${this.config.endpoints.remove}`, payload, {
        headers: this.config.headers
      });
      console.log("API request successful, processing response...");
      const response_data = response?.data || {};
      const processed_result = {
        app_has_to_be_updated: response_data.appHasToBeUpdated,
        requests_limit_exceeded: response_data.requestsLimitExceeded,
        original_video_not_found: response_data.originalVideoNotFound,
        enable_no_trial: response_data.enableNoTrial,
        enable_shady_trial: response_data.enableShadyTrial,
        redirect_to_premium: response_data.redirectToPremium,
        returned_cached_result: response_data.returnedCachedResult,
        video_without_watermark_url: response_data.videoWithoutWatermarkUrl
      };
      console.log("Watermark removal process completed successfully");
      return this.build_response(true, 200, processed_result);
    } catch (error) {
      console.log("API request failed:", error?.message || "Unknown error");
      const error_code = error?.response?.status || 500;
      const error_message = error?.response?.data?.message || error?.message || "Internal server error";
      return this.build_response(false, error_code, {
        error: error_message
      });
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new DesoraClient();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}