import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AnonymMailClient {
  constructor() {
    this.apiBase = "https://anonymmail.net/api";
    const cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: cookieJar,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://anonymmail.net",
        Referer: "https://anonymmail.net/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
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
        console.error(`ANONYMMAIL_CLIENT ERROR: Request failed with status ${error.response.status}. Response Data:`, error.response.data);
      } else if (error.request) {
        console.error("ANONYMMAIL_CLIENT ERROR: No response received:", error.request);
      } else {
        console.error("ANONYMMAIL_CLIENT ERROR: Error setting up request:", error.message);
      }
      return Promise.reject(error);
    });
  }
  async _fetchInitialCookies() {
    try {
      console.log("Fetching initial cookies from anonymmail.net...");
      await this.axiosInstance.get("https://anonymmail.net/");
      console.log("Initial cookies fetched.");
    } catch (error) {
      console.error("Failed to fetch initial cookies.", error.message);
    }
  }
  async getDomains() {
    try {
      if (!this._initialCookiesFetched) {
        await this._fetchInitialCookies();
        this._initialCookiesFetched = true;
      }
      console.log("Fetching Anonymmail.net domains...");
      const res = await this.axiosInstance.post(`${this.apiBase}/getDomains`);
      console.log("Anonymmail.net domains retrieved.");
      return res.data;
    } catch (error) {
      console.error("Failed to fetch Anonymmail.net domains.", error.message);
      throw new Error(`Failed to fetch domains: ${error.response?.data?.message || error.message}`);
    }
  }
  _generateRandomName(length = 10) {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async create({
    domain = null
  } = {}) {
    try {
      if (!this._initialCookiesFetched) {
        await this._fetchInitialCookies();
        this._initialCookiesFetched = true;
      }
      let selectedDomain = domain;
      if (!selectedDomain) {
        const domains = await this.getDomains();
        if (!domains || domains.length === 0) {
          throw new Error("No available domains found from Anonymmail.net.");
        }
        selectedDomain = domains[Math.floor(Math.random() * domains.length)].domain;
        console.log(`Randomly selected domain: ${selectedDomain}`);
      }
      const randomName = this._generateRandomName();
      const emailAddress = `${randomName}@${selectedDomain}`;
      console.log(`Creating email address: ${emailAddress}`);
      const res = await this.axiosInstance.post(`${this.apiBase}/get`, `email=${encodeURIComponent(emailAddress)}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      console.log(`Email address created: ${emailAddress}`);
      return {
        email: emailAddress,
        data: res.data
      };
    } catch (error) {
      console.error("Failed to create email address.", error.message);
      throw new Error(`Failed to create email: ${error.response?.data?.message || error.message}`);
    }
  }
  async message({
    email
  }) {
    if (!email) {
      throw new Error("Email address is required to fetch messages.");
    }
    try {
      if (!this._initialCookiesFetched) {
        await this._fetchInitialCookies();
        this._initialCookiesFetched = true;
      }
      console.log(`Fetching messages for ${email}...`);
      const res = await this.axiosInstance.post(`${this.apiBase}/get`, `email=${encodeURIComponent(email)}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      console.log(`Messages retrieved for ${email}.`);
      return res.data;
    } catch (error) {
      console.error(`Failed to fetch messages for ${email}.`, error.message);
      throw new Error(`Failed to fetch messages: ${error.response?.data?.message || error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new AnonymMailClient();
  try {
    switch (action) {
      case "list":
        try {
          const domains = await client.getDomains();
          return res.status(200).json(domains);
        } catch (error) {
          console.error("API List Domains Error:", error.message);
          return res.status(500).json({
            error: "Gagal mengambil daftar domain.",
            details: error.message
          });
        }
      case "create":
        try {
          const newData = await client.create(params);
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Email Error:", error.message);
          return res.status(500).json({
            error: "Gagal membuat email.",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await client.message(params);
          return res.status(200).json(messages);
        } catch (error) {
          console.error("API Get Messages Error:", error.message);
          return res.status(500).json({
            error: "Gagal mengambil pesan.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Tindakan tidak valid. Gunakan 'list', 'create', atau 'message'."
        });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error.message);
    return res.status(500).json({
      error: "Kesalahan Server Internal",
      details: error.message
    });
  }
}