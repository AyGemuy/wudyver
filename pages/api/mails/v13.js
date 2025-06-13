import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TempMailLAClient {
  constructor() {
    this.apiBase = "https://tempmail.la/api/mail";
    const cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: cookieJar,
      baseURL: this.apiBase,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Content-Type": "application/json",
        Locale: "en-US",
        Origin: "https://tempmail.la",
        Platform: "PC",
        Priority: "u=1, i",
        Product: "TEMP_MAIL",
        Referer: "https://tempmail.la/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      timeout: 3e4
    }));
    this.axiosInstance.interceptors.response.use(response => response, error => {
      if (error.response) {
        console.error(`TEMPMAILLA_CLIENT ERROR: Request failed with status ${error.response.status}. Response Data:`, error.response.data);
      } else if (error.request) {
        console.error("TEMPMAILLA_CLIENT ERROR: No response received:", error.request);
      } else {
        console.error("TEMPMAILLA_CLIENT ERROR: Error setting up request:", error.message);
      }
      return Promise.reject(error);
    });
  }
  async create() {
    try {
      console.log("START: Creating new TempMail.la email...");
      const res = await this.axiosInstance.post("/create", {});
      console.log("SUCCESS: TempMail.la email created.", res.data);
      return res.data;
    } catch (error) {
      console.error("ERROR: Failed to create TempMail.la email.", error.message);
      throw new Error(`Failed to create email: ${error.response?.data?.message || error.message}`);
    }
  }
  async message({
    email: address,
    cursor = null
  }) {
    if (!address) {
      throw new Error("Email address is required to fetch mailbox messages.");
    }
    try {
      console.log(`START: Fetching mailbox for ${address}...`);
      const res = await this.axiosInstance.post("/box", {
        address: address,
        cursor: cursor
      });
      console.log(`SUCCESS: Mailbox retrieved for ${address}.`);
      return res.data;
    } catch (error) {
      console.error(`ERROR: Failed to fetch mailbox for ${address}.`, error.message);
      throw new Error(`Failed to fetch mailbox: ${error.response?.data?.message || error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TempMailLAClient();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await client.create(params);
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email and UUID.",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'your-email@example.com' }"
          });
        }
        try {
          const messages = await client.message(params);
          return res.status(200).json(messages);
        } catch (error) {
          console.error("API Message Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve messages.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}