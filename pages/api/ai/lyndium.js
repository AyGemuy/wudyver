import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class LyndiumAPI {
  constructor() {
    this.baseURL = "https://gkx01m812d.execute-api.ap-southeast-2.amazonaws.com/production/graphql";
    this.mailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.userName = `${this._randomString(5)}`;
    this.lastName = `${this._randomString(5)}`;
    this.password = this._randomString(10);
    this.token = null;
    this.email = null;
    this.api = axios.create({
      baseURL: this.baseURL
    });
    this.api.interceptors.request.use(config => {
      this.logRequest(config.method, config.url, config.headers, config.data);
      return config;
    });
    this.api.interceptors.response.use(response => {
      this.logResponse(response);
      return response;
    }, error => {
      this.logError(error);
      return Promise.reject(error);
    });
  }
  _buildHeaders(isPrivate = false) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      is_private: String(isPrivate),
      origin: "https://www.lyndium.com.au",
      priority: "u=1, i",
      referer: "https://www.lyndium.com.au/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    if (isPrivate && this.token) {
      headers.authorization = `Bearer ${this.token}`;
    }
    return headers;
  }
  logRequest(method, url, headers, data) {
    console.log("\n=== REQUEST ===");
    console.log(`URL: ${method.toUpperCase()} ${url}`);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    if (data) console.log("Data:", JSON.stringify(data, null, 2));
    console.log("===============\n");
  }
  logResponse(response) {
    console.log("\n=== RESPONSE ===");
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log("Headers:", JSON.stringify(response.headers, null, 2));
    if (response.data) {
      if (typeof response.data === "object" && response.data !== null) {
        const simplifiedData = {};
        for (const key in response.data) {
          if (typeof response.data[key] === "object" && response.data[key] !== null) {
            simplifiedData[key] = {
              ...response.data[key]
            };
            if (JSON.stringify(simplifiedData[key]).length > 500) {
              simplifiedData[key] = "[TRUNCATED]";
            }
          } else {
            simplifiedData[key] = response.data[key];
          }
        }
        console.log("Data:", JSON.stringify(simplifiedData, null, 2));
      } else {
        console.log("Data:", response.data);
      }
    }
    console.log("================\n");
    return response;
  }
  logError(error) {
    console.error("\n=== ERROR ===");
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      if (error.response.data) {
        if (typeof error.response.data === "object" && error.response.data !== null) {
          const simplifiedData = {};
          for (const key in error.response.data) {
            if (typeof error.response.data[key] === "object" && error.response.data[key] !== null) {
              simplifiedData[key] = {
                ...error.response.data[key]
              };
              if (JSON.stringify(simplifiedData[key]).length > 500) {
                simplifiedData[key] = "[TRUNCATED]";
              }
            } else {
              simplifiedData[key] = error.response.data[key];
            }
          }
          console.log("Data:", JSON.stringify(simplifiedData, null, 2));
        } else {
          console.log("Data:", error.response.data);
        }
      }
      console.log("Headers:", JSON.stringify(error.response.headers, null, 2));
    } else {
      console.log("Message:", error.message);
    }
    console.log("=============\n");
    throw error;
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  _randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async followRedirects(url, maxRedirects = 5) {
    let currentUrl = url;
    let redirectCount = 0;
    while (redirectCount < maxRedirects) {
      try {
        console.log(`Following redirect ${redirectCount + 1}: ${currentUrl}`);
        const response = await axios.head(currentUrl, {
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400
        });
        if (response.headers && response.headers.location) {
          const newLocation = response.headers.location;
          currentUrl = new URL(newLocation, currentUrl).href;
          redirectCount++;
          console.log(`Redirected to: ${currentUrl}`);
        } else {
          console.log(`Final URL: ${currentUrl}`);
          return currentUrl;
        }
      } catch (error) {
        console.log(`Error following redirect: ${error.message}`);
        try {
          const response = await axios.get(currentUrl, {
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
          });
          if (response.headers && response.headers.location) {
            const newLocation = response.headers.location;
            currentUrl = new URL(newLocation, currentUrl).href;
            redirectCount++;
            console.log(`Redirected to: ${currentUrl}`);
          } else {
            console.log(`Final URL: ${currentUrl}`);
            return currentUrl;
          }
        } catch (secondError) {
          console.log(`Both HEAD and GET failed for redirect: ${secondError.message}`);
          if (secondError.response && secondError.response.status === 404) {
            console.log(`Received 404 error, assuming this is the final URL: ${currentUrl}`);
            return currentUrl;
          }
          return currentUrl;
        }
      }
    }
    console.log(`Reached maximum redirects (${maxRedirects}), returning last URL`);
    return currentUrl;
  }
  async createEmail() {
    try {
      console.log("Creating temp email...");
      const url = `${this.mailAPI}?action=create`;
      const response = await this.api.get(url);
      this.email = response.data.email;
      console.log(`Email created: ${this.email}`);
      return this.email;
    } catch (error) {}
  }
  async getMessages() {
    try {
      if (!this.email) throw new Error("Email not created");
      console.log("Checking email messages...");
      const url = `${this.mailAPI}?action=message&email=${this.email}`;
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {}
  }
  async extractToken(emailContent) {
    try {
      console.log("Extracting verification token...");
      const textContent = emailContent.data[0].text_content;
      const urlMatch = textContent.match(/https?:\/\/[^\s]+/);
      if (!urlMatch) throw new Error("Verification URL not found");
      let verificationUrl = urlMatch[0];
      console.log(`Found verification URL: ${verificationUrl}`);
      const finalUrl = await this.followRedirects(verificationUrl);
      console.log(`Final URL after redirects: ${finalUrl}`);
      const url = new URL(finalUrl);
      let token = url.searchParams.get("token") || url.searchParams.get("upn") || url.searchParams.get("verifyToken");
      if (!token && url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        token = hashParams.get("token") || hashParams.get("upn") || hashParams.get("verifyToken");
      }
      if (!token) {
        const pathMatch = finalUrl.match(/[?&](token|upn|verifyToken)=([^&]+)/);
        if (pathMatch) token = pathMatch[2];
      }
      if (!token) {
        throw new Error("Verification token not found in final URL");
      }
      console.log(`Token extracted: ${token}`);
      return token;
    } catch (error) {
      console.error("Token extraction error:", error.message);
      throw error;
    }
  }
  async signup(firstName, lastName, password) {
    try {
      if (!this.email) await this.createEmail();
      console.log("Registering new user...");
      const data = {
        operationName: "signup",
        variables: {
          user: {
            first_name: firstName,
            last_name: lastName,
            email: this.email,
            password: password,
            role: "USER"
          }
        },
        query: "mutation signup($user: SignupInput) { signup(user: $user) { jwt id role first_name last_name __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders()
      });
      console.log("Registration successful, waiting for verification...");
      return response.data;
    } catch (error) {}
  }
  async verify(token) {
    try {
      console.log("Verifying token...");
      const data = {
        operationName: "verifyToken",
        variables: {
          token: token
        },
        query: "mutation verifyToken($token: String) { verifyToken(token: $token) { jwt role first_name last_name __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders()
      });
      if (response.data.data?.verifyToken) {
        this.token = response.data.data.verifyToken.jwt;
        console.log("Token verified and saved", this.token);
      }
      return response.data;
    } catch (error) {}
  }
  async waitVerify(maxAttempts = 60, interval = 3e3) {
    try {
      console.log("Waiting for verification email...");
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Attempt ${attempt}/${maxAttempts}`);
        try {
          const messages = await this.getMessages();
          if (messages.data?.length > 0) {
            const token = await this.extractToken(messages);
            if (token) {
              console.log("Verification token found");
              return await this.verify(token);
            }
          }
        } catch (error) {
          console.log("No verification email yet, waiting...");
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      throw new Error("Verification email not found after multiple attempts");
    } catch (error) {}
  }
  async txt2vid({
    prompt,
    ...rest
  }) {
    try {
      if (!this.token) await this.autoRegister();
      console.log("Starting text-to-video process...");
      const data = {
        operationName: "initiateVideoJob",
        variables: {
          prompt: prompt,
          model_name: "Amazon Nova AI Model",
          ...rest
        },
        query: "mutation initiateVideoJob($prompt: String!, $model_name: String!) { initiateVideoJob(prompt: $prompt, model_name: $model_name) { jobId status __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      console.log("Text-to-video process started");
      const encryptedData = {
        taskId: response?.data?.data?.initiateVideoJob?.jobId,
        token: this.token,
        gen_type: "video"
      };
      return await this.enc(encryptedData);
    } catch (error) {}
  }
  async img2vid({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (!this.token) await this.autoRegister();
      console.log("Starting image-to-video process...");
      const data = {
        operationName: "initiateImageToVideoJob",
        variables: {
          prompt: prompt,
          imageUrl: imageUrl,
          model: "Amazon Nova AI Model",
          ...rest
        },
        query: "mutation initiateImageToVideoJob($imageUrl: String!, $model: String!, $prompt: String) { initiateImageToVideoJob(imageUrl: $imageUrl, model: $model, prompt: $prompt) { jobId status __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      console.log("Image-to-video process started");
      const encryptedData = {
        taskId: response?.data?.data?.initiateImageToVideoJob?.jobId,
        token: this.token,
        gen_type: "video"
      };
      return await this.enc(encryptedData);
    } catch (error) {}
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    try {
      if (!this.token) await this.autoRegister();
      console.log("Starting text-to-image process...");
      const data = {
        operationName: "initiateImageJob",
        variables: {
          prompt: prompt,
          model: "ModelsLab",
          ...rest
        },
        query: "mutation initiateImageJob($prompt: String!, $model: String!) { initiateImageJob(prompt: $prompt, model: $model) { jobId status __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      console.log("Text-to-image process started");
      const encryptedData = {
        taskId: response?.data?.data?.initiateImageJob?.jobId,
        token: this.token,
        gen_type: "image"
      };
      return await this.enc(encryptedData);
    } catch (error) {}
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (!this.token) await this.autoRegister();
      console.log("Starting image-to-image process...");
      const data = {
        operationName: "initiateImageToImageJob",
        variables: {
          prompt: prompt,
          imageUrl: imageUrl,
          style: "Image",
          ...rest
        },
        query: "mutation initiateImageToImageJob($prompt: String!, $imageUrl: String!, $style: String!) { initiateImageToImageJob(prompt: $prompt, imageUrl: $imageUrl, style: $style) { jobId status __typename } }"
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      console.log("Image-to-image process started");
      const encryptedData = {
        taskId: response?.data?.data?.initiateImageToImageJob?.jobId,
        token: this.token,
        gen_type: "image"
      };
      return await this.enc(encryptedData);
    } catch (error) {}
  }
  async status({
    input_type,
    task_id,
    ...rest
  }) {
    try {
      const decryptedData = await this.dec(task_id);
      const {
        taskId,
        token,
        gen_type
      } = decryptedData;
      if (!token || !taskId) {
        throw new Error("Membutuhkan taskId dan token untuk memeriksa status.");
      }
      this.token = token;
      const type = input_type || gen_type;
      if (type === "video") {
        return await this.videoJobStatus(taskId);
      } else if (type === "image") {
        return await this.imgJobStatus(taskId);
      }
      return null;
    } catch (error) {}
  }
  async videoJobStatus(jobId) {
    try {
      if (!this.token) await this.autoRegister();
      console.log(`Checking video job status ${jobId}...`);
      const data = {
        operationName: "getVideoJobStatus",
        variables: {
          jobId: parseInt(jobId)
        },
        query: `query getVideoJobStatus($jobId: Int!) {
        getVideoJobStatus(jobId: $jobId) {
          status
          result {
            id
            videoId
            title
            createdAt
            __typename
          }
          __typename
        }
      }`
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      if (response.data?.data?.getVideoJobStatus?.result) {
        const results = response.data.data.getVideoJobStatus.result;
        let parsedResults;
        const parseItem = item => ({
          ...item,
          videoUrl: item.videoId ? `https://dx2r83o8wtjjw.cloudfront.net/${encodeURIComponent(item.videoId)}` : null
        });
        if (Array.isArray(results)) {
          parsedResults = results.map(parseItem);
        } else if (results && typeof results === "object") {
          parsedResults = parseItem(results);
        } else {
          parsedResults = results;
        }
        return {
          ...response.data,
          data: {
            ...response.data.data,
            getVideoJobStatus: {
              ...response.data.data.getVideoJobStatus,
              result: parsedResults
            }
          }
        };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async imgJobStatus(jobId) {
    try {
      if (!this.token) await this.autoRegister();
      console.log(`Checking image job status ${jobId}...`);
      const data = {
        operationName: "getImageJobStatus",
        variables: {
          jobId: parseInt(jobId)
        },
        query: `query getImageJobStatus($jobId: Int!) {
        getImageJobStatus(jobId: $jobId) {
          status
          result {
            id
            imageId
            title
            createdAt
            __typename
          }
          __typename
        }
      }`
      };
      const response = await this.api.post(this.baseURL, data, {
        headers: this._buildHeaders(true)
      });
      if (response.data?.data?.getImageJobStatus?.result) {
        const results = response.data.data.getImageJobStatus.result;
        let parsedResults;
        const parseImageItem = item => ({
          ...item,
          imageUrl: item.imageId ? `https://dx2r83o8wtjjw.cloudfront.net/${encodeURIComponent(item.imageId)}` : null
        });
        if (Array.isArray(results)) {
          parsedResults = results.map(parseImageItem);
        } else if (results && typeof results === "object") {
          parsedResults = parseImageItem(results);
        } else {
          parsedResults = results;
        }
        return {
          ...response.data,
          data: {
            ...response.data.data,
            getImageJobStatus: {
              ...response.data.data.getImageJobStatus,
              result: parsedResults
            }
          }
        };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async autoRegister(firstName = this.userName, lastName = this.lastName, password = this.password) {
    try {
      await this.signup(firstName, lastName, password);
      return await this.waitVerify();
    } catch (error) {}
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new LyndiumAPI();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await api.img2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await api.txt2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', 'img2img', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}