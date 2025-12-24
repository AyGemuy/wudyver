import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class TempMail {
  constructor() {
    this.baseURL = "https://api.tempmail.lol";
    this.headers = {
      "user-agent": "NB Android/1.0.0"
    };
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
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
  async create({
    prefix = null
  } = {}) {
    try {
      const payload = {
        domain: null,
        captcha: null
      };
      if (prefix) payload.prefix = prefix;
      const {
        data
      } = await this.axiosInstance.post("/v2/inbox/create", payload);
      const expiresAt = new Date(new Date().getTime() + 60 * 60 * 1e3);
      const taskData = {
        email: data.address,
        token: data.token,
        expiresAt: expiresAt.toISOString()
      };
      const taskId = await this.enc(taskData);
      return {
        success: true,
        code: 200,
        result: {
          task_id: taskId,
          address: data.address
        }
      };
    } catch (error) {
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message || "An unknown error occurred during inbox creation."
        }
      };
    }
  }
  async message({
    task_id
  }) {
    try {
      const decryptedTaskData = await this.dec(task_id);
      const {
        token,
        expiresAt
      } = decryptedTaskData;
      const expiryDate = new Date(expiresAt);
      if (new Date() > expiryDate) {
        return {
          success: false,
          code: 410,
          result: {
            error: "Token for this email has expired.",
            expiresAt: expiryDate.toISOString()
          }
        };
      }
      if (!token || token.trim() === "") {
        return {
          success: true,
          code: 200,
          result: {
            token: null,
            emails: [],
            expiresAt: expiryDate.toISOString()
          }
        };
      }
      const {
        data
      } = await this.axiosInstance.get(`/v2/inbox?token=${token}`);
      if (data.expired) {
        return {
          success: false,
          code: 410,
          result: {
            error: "The email has expired. Please create a new temporary email."
          }
        };
      }
      const emails = (data.emails || []).map(e => ({
        id: e.id || e._id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        body: e.body,
        createdAt: e.createdAt,
        attachments: e.attachments || []
      }));
      return {
        success: true,
        code: 200,
        result: {
          token: token,
          expired: data.expired,
          expiresAt: expiryDate.toISOString(),
          emails: emails
        }
      };
    } catch (error) {
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message || "An unknown error occurred while fetching messages."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TempMail();
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
        if (!params.task_id) {
          return res.status(400).json({
            error: "Missing 'task_id' parameter. Example: { task_id: 'xxxxxxx' }"
          });
        }
        try {
          const messages = await client.message({
            task_id: params.task_id
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