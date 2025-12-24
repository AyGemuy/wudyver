import crypto from "crypto";
import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const REQUEST_MAX_RETRIES = 2;
const REQUEST_RETRY_DELAY_MS = 1500;
const DEFAULT_POLL_INTERVAL_MS = 2e3;
const LONG_POLL_INTERVAL_MS = 1e4;
const DEFAULT_POLL_ATTEMPTS = 30;
const LONG_POLL_ATTEMPTS = 120;
class CapcutMagicImageGenerator {
  constructor(isDebug = false) {
    this.isDebug = isDebug;
    this.config = {
      PF: "7",
      APP_VERSION: "5.8.0",
      SIGN_VERSION: "1",
      USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      X_TT_ENV: "boe",
      AUTHORITY: "edit-api-sg.capcut.com",
      ORIGIN: "https://www.capcut.com",
      REFERER: "https://www.capcut.com/",
      API_BASE_URL: "https://edit-api-sg.capcut.com",
      SIGN_SALT_1: "9e2c",
      SIGN_SALT_2: "11ac",
      TOOL_TYPE_AI_IMAGE: 1,
      SIZE_RATIO_SQUARE: 1,
      SIZE_RATIO_PORTRAIT: 2,
      SIZE_RATIO_LANDSCAPE: 3
    };
    this.baseUrl = this.config.ORIGIN;
    this.tempId = null;
    this.cookie = null;
    this.axiosInstance = axios.create();
    this.axiosInstance.interceptors.response.use(response => {
      if (response.headers["set-cookie"]) {
        const newCookies = response.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
        if (this.cookie !== newCookies) {
          this.cookie = newCookies;
          this.debug("Intercepted/Updated Cookie", this.cookie);
        }
      }
      return response;
    }, error => {
      if (error.response && error.response.headers && error.response.headers["set-cookie"]) {
        const newCookies = error.response.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
        if (this.cookie !== newCookies) {
          this.cookie = newCookies;
          this.debug("Intercepted/Updated Cookie from error response", this.cookie);
        }
      }
      return Promise.reject(error);
    });
  }
  log(text) {
    if (this.isDebug) return;
    console.log(text);
  }
  debug(label, data) {
    if (!this.isDebug) return;
    const timestamp = new Date().toISOString();
    console.log(`\n--- [DEBUG::${label.toUpperCase()}] ${timestamp} ---`);
    try {
      console.dir(data, {
        depth: null,
        colors: true
      });
    } catch (error) {
      console.error("Error during debug logging:", error);
    }
    console.log(`--- [END DEBUG::${label.toUpperCase()}] ---\n`);
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    if (this.isDebug) {
      this.debug("Built Headers", headers);
    }
    return headers;
  }
  async _request(method, url, config = {}, retryOptions = {}) {
    const {
      maxRetries = REQUEST_MAX_RETRIES,
        retryDelay = REQUEST_RETRY_DELAY_MS
    } = retryOptions;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        this.debug(`Requesting (Attempt ${attempt}/${maxRetries + 1}) ${method.toUpperCase()} ${url}`, {
          headers: config.headers,
          data: config.data
        });
        const response = await this.axiosInstance.request({
          method: method,
          url: url,
          ...config,
          validateStatus: status => status >= 200 && status < 400
        });
        this.debug(`Response SUCCESS (Attempt ${attempt}) ${method.toUpperCase()} ${url}`, {
          status: response.status,
          data: response.data
        });
        return response.data;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt > maxRetries;
        const attemptMsg = `Attempt ${attempt}/${maxRetries + 1}`;
        let errorDetails = error.message;
        let statusCode = null;
        let responseData = null;
        if (error.response) {
          statusCode = error.response.status;
          responseData = error.response.data;
          errorDetails = `Status: ${statusCode}, Data: ${JSON.stringify(responseData)}`;
          if (responseData && typeof responseData.errmsg !== "undefined") {
            this.debug(`REQUEST ERRORED (Attempt ${attempt}) but API returned data`, {
              error: error.message,
              status: statusCode,
              responseData: responseData,
              isLastAttempt: isLastAttempt
            });
            return responseData;
          }
        } else if (error.request) {
          errorDetails = "No response received from server (Network error or timeout).";
        } else {
          errorDetails = `Request setup error: ${error.message}`;
        }
        if (this.isDebug) {
          this.debug(`REQUEST FAILED (${attemptMsg}) ${method.toUpperCase()} ${url}`, {
            error: error.message,
            status: statusCode,
            responseData: responseData,
            requestConfig: {
              headers: config.headers,
              data: config.data
            },
            isLastAttempt: isLastAttempt
          });
        } else if (!isLastAttempt) {
          console.warn(`Request failed (${attemptMsg}, Status: ${statusCode ?? "N/A"}). Retrying in ${retryDelay}ms...`);
        }
        if (isLastAttempt) {
          console.error(`Request failed permanently after ${maxRetries + 1} attempts: ${method.toUpperCase()} ${url}. Final error: ${errorDetails}`);
          const genericError = new Error(`The operation failed after multiple attempts. Please check the service status or input data. Final error: ${errorDetails}`);
          genericError.cause = lastError;
          genericError.details = responseData;
          throw genericError;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error("Request failed unexpectedly after retry loop. Last error: " + (lastError ? lastError.message : "Unknown"));
  }
  _generateSign({
    url,
    pf,
    appvr,
    tdid
  }) {
    const currentTimestamp = Math.floor(Date.now() / 1e3);
    const sliceLastChars = (input, length = 7) => input.slice(-length);
    const hashMD5 = input => crypto.createHash("md5").update(input).digest("hex");
    const createSignature = (...args) => hashMD5(args.join("|")).toLowerCase();
    const baseString = createSignature(this.config.SIGN_SALT_1, sliceLastChars(url), pf, appvr, currentTimestamp, tdid, this.config.SIGN_SALT_2);
    return {
      sign: baseString,
      "device-time": currentTimestamp
    };
  }
  _generateHeaders(url, payload) {
    const signParams = {
      url: url,
      pf: this.config.PF,
      appvr: this.config.APP_VERSION,
      tdid: ""
    };
    const {
      sign,
      "device-time": deviceTime
    } = this._generateSign(signParams);
    const payloadLength = payload ? Buffer.byteLength(JSON.stringify(payload), "utf-8") : 0;
    const capcutSpecificHeaders = {
      authority: this.config.AUTHORITY,
      appvr: this.config.APP_VERSION,
      "content-length": String(payloadLength),
      "content-type": "application/json",
      cookie: this.cookie,
      "device-time": String(deviceTime),
      pf: this.config.PF,
      sign: sign,
      "sign-ver": this.config.SIGN_VERSION,
      tdid: "",
      "x-tt-env": this.config.X_TT_ENV
    };
    return this.buildHeaders(capcutSpecificHeaders);
  }
  async getCookie() {
    this.log("Fetching session cookie...");
    const targetUrl = `${this.config.ORIGIN}/tools/ai-text-to-image-generator`;
    try {
      await this.axiosInstance.get(targetUrl, {
        headers: {
          "User-Agent": this.config.USER_AGENT
        }
      });
      if (!this.cookie) {
        await this.axiosInstance.get(targetUrl, {
          headers: {
            "User-Agent": this.config.USER_AGENT
          }
        });
        if (!this.cookie) throw new Error("No cookie intercepted after GET request.");
      }
      this.debug("Cookie obtained/confirmed", this.cookie ? "Exists" : "Not found");
      return this.cookie;
    } catch (error) {
      const axiosErrorDetails = error.isAxiosError ? `Status: ${error.response?.status}, URL: ${error.config?.url}` : error.message;
      console.error(`Failed to fetch session cookie: ${axiosErrorDetails}`);
      throw new Error(`Could not get session cookie: ${axiosErrorDetails}`);
    }
  }
  async createIntelegence(slug, payload) {
    const operationName = slug ? "pipeline" : "intelligence";
    this.log(`Creating ${operationName} task (slug: '${slug || "none"}')...`);
    const slugPath = slug ? `${slug.replace(/_$/, "")}_` : "";
    const createUrl = `${this.config.API_BASE_URL}/lv/v1/intelligence/${slugPath}create`;
    const MAX_SYSTEM_BUSY_RETRIES = 30;
    const SYSTEM_BUSY_RETRY_DELAY_MS = REQUEST_RETRY_DELAY_MS + 500;
    for (let attempt = 1; attempt <= MAX_SYSTEM_BUSY_RETRIES; attempt++) {
      this.log(`Attempt ${attempt}/${MAX_SYSTEM_BUSY_RETRIES} to create ${operationName} task...`);
      const headers = this._generateHeaders(createUrl, payload);
      const createResponse = await this._request("post", createUrl, {
        headers: headers,
        data: payload
      });
      this.debug(`Create ${operationName} Task Response (Attempt ${attempt})`, createResponse);
      if (createResponse.errmsg === "success" && createResponse.data) {
        const taskId = slug ? createResponse.data.pipeline_id : createResponse.data.task_id;
        if (!taskId) {
          console.error(`Could not extract task ID from ${operationName} creation response on attempt ${attempt}, despite errmsg 'success'.`, createResponse.data);
          throw new Error(`Service reported success but did not return a valid ID for the ${operationName} task on attempt ${attempt}.`);
        }
        this.log(`${operationName} task created successfully (ID: ${taskId}) on attempt ${attempt}.`);
        return taskId;
      } else if (createResponse.errmsg === "system busy") {
        this.log(`Create ${operationName} task failed with "system busy" on attempt ${attempt}/${MAX_SYSTEM_BUSY_RETRIES}. Retrying in ${SYSTEM_BUSY_RETRY_DELAY_MS}ms...`);
        if (attempt === MAX_SYSTEM_BUSY_RETRIES) {
          console.error(`Failed to create ${operationName} task after ${MAX_SYSTEM_BUSY_RETRIES} attempts due to persistent "system busy". Response:`, createResponse);
          throw new Error(`Failed to create ${operationName} task after ${MAX_SYSTEM_BUSY_RETRIES} attempts. Last API error: system busy. Log ID: ${createResponse.log_id || "N/A"}`);
        }
        await new Promise(resolve => setTimeout(resolve, SYSTEM_BUSY_RETRY_DELAY_MS));
      } else {
        const apiErrorMessage = `API Error: ${createResponse.errmsg || JSON.stringify(createResponse)}`;
        console.error(`Failed to create ${operationName} task. ${apiErrorMessage} (Log ID: ${createResponse.log_id || "N/A"})`, createResponse);
        throw new Error(`Failed to initiate the ${operationName} operation. ${apiErrorMessage} (Log ID: ${createResponse.log_id || "N/A"})`);
      }
    }
    throw new Error(`Failed to create ${operationName} task after ${MAX_SYSTEM_BUSY_RETRIES} attempts (unknown state).`);
  }
  async pollForResult(slug, taskId, maxAttempts = DEFAULT_POLL_ATTEMPTS) {
    const operationName = slug ? "pipeline" : "intelligence";
    this.log(`Polling ${operationName} task ${taskId} (slug: '${slug || "none"}') status...`);
    const slugPath = slug ? `${slug.replace(/_$/, "")}_` : "";
    const queryUrl = `${this.config.API_BASE_URL}/lv/v1/intelligence/${slugPath}query`;
    const taskIdKey = slug ? "pipeline_id" : "task_id";
    const statusKey = slug ? "pipeline_status" : "status";
    const queryPayload = {
      [taskIdKey]: taskId,
      workspace_id: ""
    };
    const delay = maxAttempts === LONG_POLL_ATTEMPTS ? LONG_POLL_INTERVAL_MS : DEFAULT_POLL_INTERVAL_MS;
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      this.log(`Polling ${operationName} task ${taskId} status (Attempt ${attempts}/${maxAttempts})...`);
      const headers = this._generateHeaders(queryUrl, queryPayload);
      try {
        const queryResponse = await this._request("post", queryUrl, {
          headers: headers,
          data: queryPayload
        }, {
          maxRetries: 1,
          retryDelay: 1e3
        });
        this.debug(`Query ${operationName} Task Response (Attempt ${attempts})`, queryResponse);
        if (queryResponse.errmsg === "success" && queryResponse.data) {
          const status = queryResponse.data[statusKey];
          const statusTextMap = {
            1: "pending",
            2: "completed",
            3: "failed",
            4: "processing"
          };
          this.log(`Task status: ${statusTextMap[status] || `unknown (${status})`}`);
          if (status === 2) {
            this.log(`${operationName} task ${taskId} completed successfully.`);
            const resultData = slug ? queryResponse.data.pipeline_result : queryResponse.data.task_detail ?? queryResponse.data;
            if (!resultData) {
              console.warn("Task completed but result data is missing or empty.", queryResponse.data);
              throw new Error("Operation completed but returned no result data.");
            }
            return resultData;
          } else if (status === 3) {
            const failReason = queryResponse.data.fail_reason || queryResponse.data.reason || "Unknown failure reason from API.";
            console.error(`${operationName} task ${taskId} failed. Reason: ${failReason}. API Response:`, queryResponse.data);
            throw new Error(`The ${operationName} operation failed. Reason: ${failReason}`);
          }
        } else {
          const pollApiError = queryResponse.errmsg || JSON.stringify(queryResponse);
          this.log(`Polling attempt ${attempts} for task ${taskId} reported an issue. API Msg: ${pollApiError}. Retrying poll...`);
        }
      } catch (error) {
        if (error.message.includes("operation failed. Reason:")) throw error;
        console.error(`Error during polling ${operationName} task attempt ${attempts}: ${error.message}. Retrying poll...`);
        if (error.details) this.debug("Polling error details", error.details);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.log(`${operationName} task ${taskId} timed out after ${maxAttempts} attempts.`);
    throw new Error(`Timeout waiting for ${operationName} task ${taskId} result.`);
  }
  async generate({
    prompt,
    style = "anime_artist",
    quantity = 1,
    strength = .5,
    scale = 7.5,
    size_ratio = this.config.SIZE_RATIO_LANDSCAPE
  } = {}) {
    this.log(`Generating image(s) for prompt: "${prompt}"...`);
    try {
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        throw new Error("A valid text prompt is required for image generation.");
      }
      if (quantity < 1 || quantity > 4) {
        console.warn("Quantity should typically be between 1 and 4. API might have limits or adjust to a safe default.");
      }
      await this.getCookie();
      this.tempId = crypto.randomBytes(6).toString("base64url");
      const params = {
        prompt: prompt,
        style_key: style,
        quantity: quantity,
        strength: strength,
        scale: scale,
        size_ratio: size_ratio
      };
      const createPayload = {
        platform: 2,
        smart_tool_type: this.config.TOOL_TYPE_AI_IMAGE,
        tmp_id: this.tempId,
        params: JSON.stringify(params)
      };
      const taskId = await this.createIntelegence("", createPayload);
      const result = await this.pollForResult("", taskId, DEFAULT_POLL_ATTEMPTS);
      if (!Array.isArray(result)) {
        console.error("Image generation result was not in the expected array format.", result);
        throw new Error("Failed to parse image generation results from the service.");
      }
      const imageUrls = result.map(detail => detail?.image?.url).filter(url => url);
      if (imageUrls.length === 0) {
        console.warn("Image generation task completed but no image URLs were found in the result.", result);
        const errorMessages = result.map(detail => detail?.extra?.error_msg || detail?.error_msg).filter(Boolean);
        if (errorMessages.length > 0) {
          throw new Error(`Operation completed, but no images were generated. API reported: ${errorMessages.join(", ")}`);
        }
        throw new Error("Operation completed, but no images were generated successfully.");
      }
      this.log(`Generated ${imageUrls.length} image URL(s).`);
      this.debug("Generated Image URLs", imageUrls);
      return {
        status: true,
        result: imageUrls
      };
    } catch (error) {
      console.error(`[CapcutMagicImageGenerator] Image generation failed: ${error.message}`);
      this.debug("Image Generation Full Error Details", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        details: error.details
      });
      const errorMessage = error.message || "An unknown error occurred during image generation.";
      return {
        status: false,
        error: `Image generation process failed: ${errorMessage}`
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new CapcutMagicImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}