import axios from "axios";
import * as cheerio from "cheerio";
import {
  EventSource
} from "eventsource";
class MindtripChat {
  constructor() {
    this.baseUrl = "https://mindtrip.ai";
    this.apiUrl = "https://api.mindtrip.ai";
    this.apiServerToken = null;
    this.chatId = null;
    this.tripRef = null;
    this.userRef = null;
    this.userLocation = null;
    this.cookieJar = new Map();
    this.defaultHeaders = {
      "accept-language": "id-ID",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.axiosInstance = axios.create();
    this.setupResponseInterceptor();
  }
  setupResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        setCookieHeaders.forEach(cookie => {
          const [nameValue] = cookie.split(";");
          const [name, value] = nameValue.split("=");
          if (name && value) {
            this.cookieJar.set(name.trim(), value.trim());
          }
        });
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
  }
  getCookieString() {
    return Array.from(this.cookieJar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  async createAnonymousUser() {
    try {
      const response = await this.axiosInstance.post(`${this.baseUrl}/api/create-anonymous-user`, {
        cf_token: "turnstile_disabled",
        type: "invisible"
      }, {
        headers: {
          ...this.defaultHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: this.baseUrl,
          priority: "u=1, i",
          referer: `${this.baseUrl}/chat`
        }
      });
      this.apiServerToken = response.data?.apiServerToken;
      return response.data;
    } catch (error) {
      throw new Error(`Gagal membuat pengguna anonim: ${error.message}`);
    }
  }
  async authenticateUser() {
    try {
      if (this.apiServerToken) {
        const authValue = encodeURIComponent(JSON.stringify({
          apiServerToken: this.apiServerToken
        }));
        this.cookieJar.set("mindtrip.auth", authValue);
      }
      const response = await this.axiosInstance.get(`${this.apiUrl}/api/auth/authenticated`, {
        headers: {
          ...this.defaultHeaders,
          accept: "application/json, text/plain, */*",
          origin: this.baseUrl,
          priority: "u=1, i",
          referer: `${this.baseUrl}/`,
          cookie: this.getCookieString()
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengotentikasi pengguna: ${error.message}`);
    }
  }
  async initializeChat() {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/chat`, {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "cache-control": "max-age=0",
          priority: "u=0, i",
          referer: `${this.baseUrl}/chat`,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "upgrade-insecure-requests": "1",
          cookie: this.getCookieString()
        }
      });
      const $ = cheerio.load(response.data);
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        const nextData = JSON.parse(nextDataScript);
        const pageProps = nextData.props?.pageProps;
        this.chatId = pageProps?.chat?.id;
        this.tripRef = pageProps?.chat?.trip?.ref;
        this.userRef = pageProps?.initUser?.user_ref;
        this.userLocation = pageProps?.userLocation;
        return pageProps;
      } else {
        throw new Error("Gagal mengekstrak data obrolan dari halaman");
      }
    } catch (error) {
      throw new Error(`Gagal menginisialisasi obrolan: ${error.message}`);
    }
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      if (!this.apiServerToken || !this.chatId || !this.userLocation) {
        await this.createAnonymousUser();
        await this.authenticateUser();
        await this.initializeChat();
      }
      const messageData = {
        message_body: prompt,
        bot: "default",
        attachments: [],
        location_of_interest: this.userLocation?.entity_ref,
        exact_lat: this.userLocation?.latitude,
        exact_long: this.userLocation?.longitude,
        ...rest
      };
      console.log("Sending message with payload:", JSON.stringify(messageData, null, 2));
      console.log("Using cookies:", this.getCookieString());
      const initialResponse = await this.axiosInstance.post(`${this.apiUrl}/api/chats/${this.chatId}/message`, messageData, {
        headers: {
          ...this.defaultHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: this.baseUrl,
          priority: "u=1, i",
          referer: `${this.baseUrl}/`,
          "sec-fetch-site": "same-site",
          cookie: this.getCookieString()
        }
      });
      console.log("Initial response:", JSON.stringify(initialResponse.data, null, 2));
      const streamId = initialResponse.data?.stream_id;
      const chatId = initialResponse.data?.customer_message?.chat_id;
      if (!streamId || !chatId) {
        throw new Error("Tidak dapat menemukan stream_id atau chat_id dari respons awal.");
      }
      const streamUrl = `${this.baseUrl}/api/events?chat_id=${chatId}&stream_id=${streamId}`;
      console.log("Streaming from URL:", streamUrl);
      return new Promise(async (resolve, reject) => {
        try {
          const streamResponse = await this.axiosInstance.get(streamUrl, {
            headers: {
              accept: "text/event-stream",
              "accept-language": "id-ID,id;q=0.9",
              "cache-control": "no-cache",
              priority: "u=1, i",
              referer: `${this.baseUrl}/chat/${chatId}`,
              "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
              "sec-ch-ua-mobile": "?1",
              "sec-ch-ua-platform": '"Android"',
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
              cookie: this.getCookieString()
            },
            responseType: "stream",
            timeout: 6e4
          });
          let fullResponse = "";
          let buffer = "";
          streamResponse.data.on("data", chunk => {
            buffer += chunk.toString();
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            events.forEach(event => {
              if (event.trim()) {
                const lines = event.split("\n");
                let eventData = null;
                lines.forEach(line => {
                  if (line.startsWith("data: ")) {
                    try {
                      eventData = JSON.parse(line.slice(6));
                    } catch (e) {
                      console.log("Non-JSON data:", line.slice(6));
                    }
                  }
                });
                if (eventData) {
                  console.log("Stream event:", eventData);
                  if (eventData.message_body) {
                    fullResponse += eventData.message_body;
                  }
                  if (eventData.status === "done") {
                    resolve({
                      ...eventData,
                      full_message: fullResponse
                    });
                    return;
                  }
                }
              }
            });
          });
          streamResponse.data.on("end", () => {
            if (fullResponse) {
              resolve({
                status: "done",
                full_message: fullResponse
              });
            } else {
              reject(new Error("Stream ended without complete response"));
            }
          });
          streamResponse.data.on("error", err => {
            console.error("Stream error:", err);
            reject(new Error(`Stream error: ${err.message}`));
          });
        } catch (error) {
          console.error("Streaming request failed:", error.response?.status, error.response?.statusText);
          reject(new Error(`Streaming failed: ${error.message}`));
        }
      });
    } catch (error) {
      throw new Error(`Gagal mengirim atau streaming pesan obrolan: ${error.message}`);
    }
  }
  getSessionInfo() {
    return {
      apiServerToken: this.apiServerToken,
      chatId: this.chatId,
      userRef: this.userRef,
      userLocation: this.userLocation,
      cookies: this.getCookieString()
    };
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
    const mindtripChat = new MindtripChat();
    const response = await mindtripChat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}