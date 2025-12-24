import axios from "axios";
class TempMailClient {
  constructor() {
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://tempmail365.com",
      referer: "https://tempmail365.com/",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    };
  }
  async create() {
    try {
      const res = await axios.post("https://tempmail365.com/init", null, {
        headers: {
          ...this.baseHeaders,
          authorization: "",
          "content-length": "0",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      if (res.data.code === 0 && res.data.data.token) {
        return {
          token: res.data.data.token,
          address: res.data.data.address
        };
      } else {
        throw new Error(res.data.message || "Gagal inisialisasi.");
      }
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async message({
    token
  }) {
    if (!token) return {
      error: "Token tidak tersedia"
    };
    try {
      const res = await axios.get("https://tempmail365.com/web/emails", {
        headers: {
          ...this.baseHeaders,
          authorization: token,
          "x-requested-with": "XMLHttpRequest",
          accept: "application/json, text/javascript, */*; q=0.01"
        }
      });
      return res.data.code === 0 ? res.data.data : {
        error: res.data.message
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TempMailClient();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await client.create();
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email and UUID.",
            details: error.message
          });
        }
      case "message":
        if (!params.token) {
          return res.status(400).json({
            error: "Missing 'token' parameter. Example: { token: 'xxxxxxx' }"
          });
        }
        try {
          const messages = await client.message({
            token: params.token
          });
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