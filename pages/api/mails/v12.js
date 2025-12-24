import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class MailTickingAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      baseURL: "https://www.mailticking.com",
      jar: this.cookieJar,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.mailticking.com",
        Referer: "https://www.mailticking.com/",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      withCredentials: true,
      timeout: 3e4
    }));
    this.currentEmail = null;
    this.activationCode = null;
    this._initialPageLoaded = false;
    this.axiosInstance.interceptors.response.use(response => response, error => {
      if (error.response) {
        console.error(`MAILTICKING_API ERROR: Request to ${error.config.url} failed with status ${error.response.status}. Response Data:`, error.response.data);
      } else if (error.request) {
        console.error(`MAILTICKING_API ERROR: No response received for ${error.config.url}:`, error.request);
      } else {
        console.error("MAILTICKING_API ERROR: Error setting up request:", error.message);
      }
      return Promise.reject(error);
    });
  }
  async _loadInitialPage() {
    if (this._initialPageLoaded) {
      return;
    }
    console.log("INFO: Loading initial page to establish session and cookies...");
    try {
      await this.axiosInstance.get("/");
      this._initialPageLoaded = true;
      console.log("SUCCESS: Initial page loaded, session established.");
    } catch (error) {
      console.error("ERROR: Failed to load initial page and establish session.", error.message);
      throw new Error(`Failed to initialize session: ${error.message}`);
    }
  }
  async _getMailbox(types = ["1", "2", "3", "4"]) {
    await this._loadInitialPage();
    try {
      console.log(`INFO: Requesting new mailbox with types: ${types.join(", ")}`);
      const response = await this.axiosInstance.post("/get-mailbox", {
        types: types
      });
      if (response.data && response.data.success) {
        this.currentEmail = response.data.email;
        console.log(`SUCCESS: Mailbox obtained: ${this.currentEmail}`);
        return response.data;
      } else {
        const errorMessage = response.data ? JSON.stringify(response.data) : "Unknown error";
        throw new Error(`Failed to get mailbox: ${errorMessage}`);
      }
    } catch (error) {
      console.error("ERROR: Failed to get mailbox.", error.message);
      throw error;
    }
  }
  async _activateEmail(email) {
    await this._loadInitialPage();
    const emailToActivate = email || this.currentEmail;
    if (!emailToActivate) {
      throw new Error("Email is required for activation. Please create a mailbox first or provide an email.");
    }
    try {
      console.log(`INFO: Activating email: ${emailToActivate}`);
      const response = await this.axiosInstance.post("/activate-email", {
        email: emailToActivate
      });
      if (response.data && response.data.success) {
        console.log(`SUCCESS: Email ${emailToActivate} activated.`);
        return response.data;
      } else {
        const errorMessage = response.data ? JSON.stringify(response.data) : "Unknown error";
        throw new Error(`Failed to activate email: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`ERROR: Failed to activate email ${emailToActivate}.`, error.message);
      throw error;
    }
  }
  async _fetchPageAndExtractCode() {
    await this._loadInitialPage();
    try {
      console.log("INFO: Fetching main page to extract activation code...");
      const pageResponse = await this.axiosInstance.get("/");
      const $ = cheerio.load(pageResponse.data);
      const inputElement = $("#active-mail");
      const code = inputElement.attr("data-code");
      if (!code) {
        throw new Error("Activation data-code not found on the page. The email might not be active yet, or the page structure has changed.");
      }
      this.activationCode = code;
      console.log(`SUCCESS: Activation code extracted: ${code}`);
      return code;
    } catch (error) {
      console.error("ERROR: Failed to fetch page or extract code.", error.message);
      throw error;
    }
  }
  async create({
    types = ["1", "2", "3", "4"]
  } = {}) {
    console.log("START: Creating new email and activating it...");
    try {
      const mailboxResponse = await this._getMailbox(types);
      if (!mailboxResponse.email) {
        throw new Error("Failed to obtain email from mailbox response after _getMailbox call.");
      }
      const email = mailboxResponse.email;
      await this._activateEmail(email);
      let code = null;
      try {
        code = await this._fetchPageAndExtractCode();
      } catch (error) {
        console.warn("WARNING: Failed to get activation code immediately after activation. It might take some time for it to appear or the page structure has changed.", error.message);
      }
      this.currentEmail = email;
      this.activationCode = code;
      console.log(`SUCCESS: Email created: ${email}, Activation Code: ${code || "N/A"}`);
      return {
        email: email,
        activationCode: code
      };
    } catch (error) {
      console.error("ERROR: Failed to create and activate email.", error.message);
      throw error;
    }
  }
  async message({
    email
  }) {
    if (!email) {
      throw new Error("Email is required to retrieve messages.");
    }
    await this._loadInitialPage();
    let code = this.activationCode;
    if (!code || this.currentEmail !== email) {
      console.log("INFO: Activation code not found or email mismatch. Attempting to retrieve from main page...");
      try {
        if (this.currentEmail !== email) {
          console.log(`INFO: Switching context to email: ${email}`);
          await this._activateEmail(email);
          this.currentEmail = email;
        }
        code = await this._fetchPageAndExtractCode();
      } catch (error) {
        console.error("ERROR: Could not extract code from page. Ensure email is activated and the page loads correctly.", error.message);
        throw error;
      }
    }
    if (!code) {
      throw new Error("Activation code not available even after re-attempt. Cannot retrieve emails.");
    }
    try {
      console.log(`INFO: Retrieving messages for ${email} with code ${code}...`);
      const response = await this.axiosInstance.post("/get-emails?lang=", {
        email: email,
        code: code
      });
      if (response.data) {
        console.log(`SUCCESS: Messages retrieved for ${email}.`);
        return response.data;
      } else {
        throw new Error(`Failed to retrieve messages: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error(`ERROR: Failed to retrieve messages for ${email}.`, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new MailTickingAPI();
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
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
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