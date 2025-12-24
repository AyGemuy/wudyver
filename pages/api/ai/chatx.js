import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import {
  EventSource
} from "eventsource";
import SpoofHead from "@/lib/spoof-head";
class ChatX {
  constructor() {
    this.baseUrl = "https://chatx.ai";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true
    });
    this.cookies = "";
    this.csrfToken = "";
    this.userId = "";
    this.chatsId = "";
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const newCookies = setCookieHeader.map(cookie => cookie.split(";")[0]);
        const existingCookieMap = new Map(this.cookies.split("; ").filter(Boolean).map(c => c.split("=")));
        newCookies.forEach(newCookie => {
          const [name, value] = newCookie.split("=");
          existingCookieMap.set(name, value);
        });
        this.cookies = Array.from(existingCookieMap).map(([name, value]) => `${name}=${value}`).join("; ");
        this.axiosInstance.defaults.headers.common["Cookie"] = this.cookies;
      }
      return response;
    }, error => {
      console.error("Axios response interceptor error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies) config.headers["Cookie"] = this.cookies;
      if (this.csrfToken && config.method === "post") config.headers["X-CSRF-TOKEN"] = this.csrfToken;
      return config;
    }, error => {
      console.error("Axios request interceptor error:", error.message);
      return Promise.reject(error);
    });
  }
  randomCryptoIP() {
    return Array.from(crypto.randomBytes(4)).map(b => b % 256).join(".");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
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
      "x-request-id": this.chatsId,
      ...SpoofHead(),
      ...extra
    };
  }
  async initializeSession() {
    if (this.csrfToken && this.cookies && this.chatsId) {
      return {
        csrfToken: this.csrfToken,
        cookies: this.cookies,
        chatsId: this.chatsId
      };
    }
    try {
      console.log("Initializing session - fetching cookies, CSRF token, and chat ID...");
      const response = await this.axiosInstance.get("/", {
        headers: this.buildHeaders({
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
        })
      });
      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content");
      const formToken = $('form[action="https://chatx.ai/dologin"] input[name="_token"]').attr("value");
      if (formToken) {
        this.csrfToken = formToken;
        console.log("CSRF Token obtained from login form.");
      } else if (this.csrfToken) {
        console.log("CSRF Token obtained from meta tag.");
      } else {
        console.warn("CSRF token not found on initial page load.");
      }
      const chatIDMatch = $('div.chats a[onclick^="openconversions"]').attr("onclick");
      if (chatIDMatch) {
        const match = chatIDMatch.match(/'(\d+)'/);
        if (match && match[1]) {
          this.chatsId = match[1];
          console.log("Chat ID obtained from div.chats:", this.chatsId);
        } else {
          console.warn("Chat ID not found in openconversions attribute. Setting a default random ID.");
          this.chatsId = this.randomCryptoIP().replace(/\./g, "");
        }
      } else {
        console.warn("Chat ID element not found on initial page load. Setting a default random ID.");
        this.chatsId = this.randomCryptoIP().replace(/\./g, "");
      }
      if (response.headers["set-cookie"]) {
        this.cookies = response.headers["set-cookie"].map(cookie => cookie.split(";")[0]).join("; ");
        this.axiosInstance.defaults.headers.common["Cookie"] = this.cookies;
        console.log("Initial Cookies obtained.");
      } else {
        console.warn("No initial cookies found in the response.");
      }
      if (!this.csrfToken && !this.cookies && !this.chatsId) throw new Error("Failed to get initial CSRF token, cookies, and chat ID.");
      console.log("Session initialization complete.");
      return {
        csrfToken: this.csrfToken,
        cookies: this.cookies,
        chatsId: this.chatsId
      };
    } catch (error) {
      console.error("Error during session initialization:", error.message);
      throw error;
    }
  }
  async getChatAndUserIds() {
    if (!this.userId || !this.chatsId) {
      await this.initializeSession();
    }
    if (!this.userId) {
      this.userId = this.chatsId;
      console.log("User ID not explicitly found, using chats ID as User ID:", this.userId);
    }
    const data = new URLSearchParams({
      _token: this.csrfToken,
      id: this.chatsId,
      page: "0"
    }).toString();
    const headers = this.buildHeaders({
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01"
    });
    try {
      console.log(`Attempting to fetch user ID and chats ID from /en/openconversions with chatsId: ${this.chatsId}...`);
      const response = await this.axiosInstance.post("/en/openconversions", data, {
        headers: headers
      });
      if (response.data && response.data.chats) {
        this.userId = response.data.chats.user_id;
        this.chatsId = response.data.chats.id;
        console.log("User ID obtained from /en/openconversions:", this.userId);
        console.log("Chats ID obtained from /en/openconversions:", this.chatsId);
      } else {
        console.warn("User ID or Chats ID not found in /en/openconversions response. Using existing/generated IDs.");
      }
      return {
        userId: this.userId,
        chatsId: this.chatsId
      };
    } catch (error) {
      console.error("Error fetching user ID and chats ID from /en/openconversions:", error.message);
      console.warn("Failed to get user ID and chats ID from API. Using existing/generated IDs:", this.userId, this.chatsId);
      return {
        userId: this.userId,
        chatsId: this.chatsId
      };
    }
  }
  async sendChat({
    prompt,
    current_model = "gpt3",
    is_web = 0
  }) {
    await this.initializeSession();
    await this.getChatAndUserIds();
    const data = new URLSearchParams({
      _token: this.csrfToken,
      user_id: this.userId,
      chats_id: this.chatsId,
      prompt: prompt,
      current_model: current_model,
      is_web: is_web
    }).toString();
    const headers = this.buildHeaders({
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01"
    });
    try {
      console.log("Sending chat prompt...");
      const response = await this.axiosInstance.post("/en/sendchat", data, {
        headers: headers
      });
      console.log("SendChat response received.");
      return response.data;
    } catch (error) {
      console.error("Error sending chat:", error.message);
      throw error;
    }
  }
  async streamChat({
    current_model = "gpt3",
    conversions_id,
    ass_conversions_id,
    g_recaptcha_response = "",
    reasoning_effort = "medium",
    is_web = 0
  }) {
    await this.initializeSession();
    await this.getChatAndUserIds();
    const params = new URLSearchParams({
      user_id: this.userId,
      chats_id: this.chatsId,
      current_model: current_model,
      conversions_id: conversions_id,
      ass_conversions_id: ass_conversions_id,
      g_recaptcha_response: g_recaptcha_response,
      is_web: is_web,
      reasoning_effort: reasoning_effort
    }).toString();
    const streamUrl = `${this.baseUrl}/en/chats_stream?${params}`;
    console.log("Starting chat stream from URL:", streamUrl);
    const esOptions = {
      headers: {
        Cookie: this.cookies,
        ...this.buildHeaders({
          Accept: "text/event-stream"
        })
      }
    };
    return new Promise((resolve, reject) => {
      let fullContent = "";
      const es = new EventSource(streamUrl, esOptions);
      es.onopen = () => console.log("EventSource connection opened.");
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.choices?.[0]?.delta?.content) fullContent += data.choices[0].delta.content;
          else if (event.data === "[DONE]") {
            console.log("Stream received [DONE] event.");
            es.close();
            resolve(fullContent);
          }
        } catch (e) {
          if (event.data === "[DONE]") {
            console.log("Stream received [DONE] event during parsing attempt.");
            es.close();
            resolve(fullContent);
          } else {
            console.error("Error parsing EventSource message:", e.message, "Data:", event.data);
          }
        }
      };
      es.onerror = err => {
        console.error("EventSource error:", err);
        es.close();
        reject(new Error("EventSource error during stream: " + (err.message || "Unknown error")));
      };
      es.onclose = () => {
        console.log("EventSource connection closed.");
        resolve(fullContent);
      };
    });
  }
  async chat({
    prompt,
    current_model = "gpt3",
    is_web = 0
  }) {
    try {
      console.log("Starting combined chat process...");
      await this.initializeSession();
      console.log("Session ensured.");
      await this.getChatAndUserIds();
      console.log(`User ID: ${this.userId}, Chats ID: ${this.chatsId} ensured.`);
      console.log(`Sending prompt: "${prompt}" with model: "${current_model}"`);
      const sendChatResponse = await this.sendChat({
        prompt: prompt,
        current_model: current_model,
        is_web: is_web
      });
      if (sendChatResponse?.conversions_id && sendChatResponse?.ass_conversions_id) {
        const {
          conversions_id: conversionsId,
          ass_conversions_id: assConversionsId
        } = sendChatResponse;
        console.log(`Initial chat sent. Conversions ID: ${conversionsId}, Ass Conversions ID: ${assConversionsId}.`);
        console.log("Starting to stream the chat response...");
        const streamContent = await this.streamChat({
          current_model: current_model,
          conversions_id: conversionsId,
          ass_conversions_id: assConversionsId,
          is_web: is_web
        });
        console.log("Chat stream finished.");
        return streamContent;
      } else {
        const errorMessage = "SendChat did not return valid conversions_id or ass_conversions_id.";
        console.error(errorMessage, sendChatResponse);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error in combined chat method:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const chatClient = new ChatX();
    const response = await chatClient.chat(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}