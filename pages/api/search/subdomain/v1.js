import axios from "axios";
class PentestFinder {
  constructor() {
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";
    this.scanResult = null;
    this.axiosInstance = axios.create({
      baseURL: "https://pentest-tools.com",
      headers: {
        "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": this.ua,
        "accept-language": "ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const cookies = setCookieHeader.map(c => c.split(";")[0]).join("; ");
        if (!this.currentCookies) {
          this.currentCookies = cookies;
          console.log("[LOG] Initial cookies obtained:", cookies);
        } else {
          this.currentCookies += `; ${cookies}`;
          console.log("[LOG] Appended cookies:", cookies);
        }
        this.axiosInstance.defaults.headers.common["cookie"] = this.currentCookies;
      }
      return response;
    }, error => {
      console.error("[ERROR] Interceptor Response Error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.request.use(config => {
      if (this.currentCookies) {
        config.headers["cookie"] = this.currentCookies;
        console.log(`[LOG] Attaching cookies to request for ${config.url}`);
      }
      return config;
    }, error => {
      console.error("[ERROR] Interceptor Request Error:", error.message);
      return Promise.reject(error);
    });
  }
  async search({
    domain
  }) {
    if (!domain) {
      throw new Error("Domain is required for the search.");
    }
    console.log(`[LOG] Starting scan for domain: ${domain}`);
    try {
      console.log("[LOG] Attempting to get initial page to establish session...");
      await this.axiosInstance.get("/information-gathering/find-subdomains-of-domain", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("[LOG] Initial session established.");
      console.log("[LOG] Requesting authentication token...");
      await this.axiosInstance.post("/api/auth/token", "", {
        headers: {
          origin: "https://pentest-tools.com",
          accept: "*/*",
          "content-length": "0"
        }
      });
      console.log("[LOG] Authentication token obtained.");
      console.log("[LOG] Sending request to start scan...");
      const scanResponse = await this.axiosInstance.post("/api/auth/scans", {
        redirect_level: "same_domain",
        target_name: domain,
        tool_id: 20,
        tool_params: {
          scan_type: "light",
          web_details: true,
          whois_info: true
        }
      }, {
        headers: {
          origin: "https://pentest-tools.com",
          "content-type": "application/json",
          accept: "application/json"
        }
      });
      const scanId = scanResponse.data?.data?.created_id;
      if (!scanId) {
        throw new Error("Failed to get scan ID from the response.");
      }
      console.log(`[LOG] Scan started successfully. Scan ID: ${scanId}`);
      console.log("[LOG] Waiting for scan results...");
      await this.waitForResult(scanId);
      console.log("[LOG] Scan completed. Results retrieved.");
      return this.scanResult;
    } catch (error) {
      console.error("[ERROR] An error occurred during the scan process:", error.message);
      if (error.response) {
        console.error("[ERROR] Response data:", error.response.data);
        console.error("[ERROR] Response status:", error.response.status);
        console.error("[ERROR] Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("[ERROR] No response received for the request.");
      } else {
        console.error("[ERROR] Error setting up the request.");
      }
      throw error;
    }
  }
  async waitForResult(scanId) {
    let attempts = 0;
    const maxAttempts = 20;
    while (true && attempts < maxAttempts) {
      attempts++;
      console.log(`[LOG] Checking scan progress for ID ${scanId}. Attempt ${attempts}/${maxAttempts}`);
      const res = await this.axiosInstance.get(`/api/auth/scans_internal/${scanId}`, {
        headers: {
          accept: "application/json"
        }
      });
      const progress = res.data?.data?.progress;
      this.scanResult = res.data?.data;
      console.log(`[LOG] Scan progress: ${progress}%`);
      if (progress >= 100) {
        console.log("[LOG] Scan reached 100% completion.");
        break;
      }
      console.log("[LOG] Scan not complete, waiting 5 seconds before next check...");
      await new Promise(r => setTimeout(r, 5e3));
    }
    if (attempts >= maxAttempts) {
      console.warn(`[WARNING] Maximum attempts (${maxAttempts}) reached for scan ID ${scanId}. Scan might not be complete.`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.domain) {
    return res.status(400).json({
      error: "domain are required"
    });
  }
  try {
    const pentest = new PentestFinder();
    const response = await pentest.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}