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
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        locale: "en-US",
        origin: "https://tempmail.la",
        platform: "PC",
        priority: "u=1, i",
        product: "TEMP_MAIL",
        referer: "https://tempmail.la/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 3e4
    }));
  }
  async create() {
    try {
      console.log("START: Creating new TempMail.la email...");
      const res = await this.axiosInstance.post("/create", {});
      console.log("SUCCESS: TempMail.la email created.", res.data);
      return res.data;
    } catch (error) {
      console.error("ERROR: Failed to create TempMail.la email.", error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  async message({
    email: address,
    cursor = null
  }) {
    if (!address) {
      throw new Error("Email address is required.");
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
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action
  } = params;
  const client = new TempMailLAClient();
  try {
    switch (action) {
      case "create":
        const newData = await client.create();
        return res.status(200).json(newData);
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter."
          });
        }
        const messages = await client.message({
          email: params.email,
          cursor: params.cursor || null
        });
        return res.status(200).json(messages);
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}