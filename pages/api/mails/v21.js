import axios from "axios";
class TemporaryGmailApi {
  constructor(apiKey = "33b5fc1663msha9ab0128c5449e7p13f98bjsnc0b11b98db57") {
    this.baseUrl = "https://temporary-gmail-account.p.rapidapi.com";
    this.apiKey = apiKey;
    this.headers = {
      "Content-Type": "application/json",
      "x-rapidapi-host": "temporary-gmail-account.p.rapidapi.com",
      "x-rapidapi-key": this.apiKey
    };
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers
    });
    console.log("Proses: TemporaryGmailApi diinisialisasi.");
  }
  async _doPostReq(endpoint, data, actionName) {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    console.log(`Proses: Memulai request POST [${actionName}] ke: ${fullUrl}`);
    let result = {
      success: false,
      status_code: 500,
      message: `Gagal melakukan aksi ${actionName}.`,
      data: null,
      metadata: {
        endpoint: endpoint,
        input_data: data
      }
    };
    try {
      const response = await this.api.post(endpoint, data);
      console.log(`Proses: Request ${actionName} berhasil.`);
      const responseData = response.data || {};
      const isSuccess = response.status === 200 && !responseData.error;
      result.success = isSuccess;
      result.status_code = response.status;
      result.message = isSuccess ? `${actionName} berhasil.` : responseData.message || responseData.error || `Aksi ${actionName} gagal.`;
      result.data = responseData;
      return result;
    } catch (error) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || {};
      const message = errorData.error || error.message || `Terjadi kesalahan saat ${actionName}`;
      console.error(`ERROR: Aksi ${actionName} gagal! Status: ${status}, Pesan: ${message}`);
      result.status_code = status;
      result.message = message;
      result.data = errorData;
      return result;
    }
  }
  async create({
    generateNewAccount = 0,
    ...rest
  } = {}) {
    return await this._doPostReq("/GmailGetAccount", {
      generateNewAccount: generateNewAccount,
      ...rest
    }, "buat (getAccount)");
  }
  async inbox({
    address,
    token,
    ...rest
  } = {}) {
    if (!address || !token) {
      return {
        success: false,
        status_code: 400,
        message: "Parameter 'address' dan 'token' harus diisi.",
        data: null,
        metadata: {
          input: {
            address: address || "N/A",
            token: token ? "Provided" : "N/A"
          }
        }
      };
    }
    return await this._doPostReq("/GmailGetMessages", {
      address: address,
      token: token,
      ...rest
    }, "kotak (getMessages)");
  }
  async message({
    messageId,
    address,
    token,
    ...rest
  } = {}) {
    if (!messageId || !address || !token) {
      return {
        success: false,
        status_code: 400,
        message: `Parameter ${(!messageId ? "messageId " : "") || (!address ? "address " : "") || (!token ? "token " : "")}harus diisi.`,
        data: null,
        metadata: {
          input: {
            messageId: messageId,
            address: address,
            token: token ? "Provided" : "N/A"
          }
        }
      };
    }
    return await this._doPostReq("/GmailGetMessage", {
      messageId: messageId,
      address: address,
      token: token,
      ...rest
    }, "baca (getMessage)");
  }
  async download({
    fileName,
    messageId,
    address,
    token,
    ...rest
  } = {}) {
    if (!fileName || !messageId || !address || !token) {
      return {
        success: false,
        status_code: 400,
        message: "Semua parameter (fileName, messageId, address, token) harus diisi.",
        data: null,
        metadata: {
          input: {
            fileName: fileName,
            messageId: messageId,
            address: address,
            token: token ? "Provided" : "N/A"
          }
        }
      };
    }
    return await this._doPostReq("/GmailAttachmentDownload", {
      fileName: fileName,
      messageId: messageId,
      address: address,
      token: token,
      ...rest
    }, "unduh (downloadAttachment)");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new TemporaryGmailApi();
  try {
    switch (action) {
      case "create":
        try {
          console.log(`API Proses: Menerima permintaan 'create' (buat) dengan params: ${JSON.stringify(params)}`);
          const result = await api.create(params);
          return res.status(result.status_code || 200).json(result);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create/get account.",
            details: error.message
          });
        }
      case "inbox":
        if (!params.address || !params.token) {
          return res.status(400).json({
            error: "Missing 'address' or 'token' parameters.",
            example: "{ action: 'inbox', address: 'user@temp-gmail.com', token: 'XYZ...' }"
          });
        }
        try {
          console.log(`API Proses: Menerima permintaan 'inbox' (kotak) untuk Address: ${params.address}`);
          const result = await api.inbox(params);
          return res.status(result.status_code || 200).json(result);
        } catch (error) {
          console.error("API Inbox Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve inbox messages.",
            details: error.message
          });
        }
      case "message":
        if (!params.messageId || !params.address || !params.token) {
          return res.status(400).json({
            error: "Missing 'messageId', 'address', or 'token' parameters.",
            example: "{ action: 'message', messageId: 'MSG123', address: 'user@temp-gmail.com', token: 'XYZ...' }"
          });
        }
        try {
          console.log(`API Proses: Menerima permintaan 'message' (baca) untuk Message ID: ${params.messageId}`);
          const result = await api.message(params);
          return res.status(result.status_code || 200).json(result);
        } catch (error) {
          console.error("API Message Detail Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve message detail.",
            details: error.message
          });
        }
      case "download":
        if (!params.fileName || !params.messageId || !params.address || !params.token) {
          return res.status(400).json({
            error: "Missing 'fileName', 'messageId', 'address', or 'token' parameters.",
            example: "{ action: 'download', fileName: 'file.pdf', messageId: 'MSG123', address: 'user@temp-gmail.com', token: 'XYZ...' }"
          });
        }
        try {
          console.log(`API Proses: Menerima permintaan 'download' (unduh) untuk File: ${params.fileName}`);
          const result = await api.download(params);
          return res.status(result.status_code || 200).json(result);
        } catch (error) {
          console.error("API Download Error:", error.message);
          return res.status(500).json({
            error: "Failed to download attachment.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create', 'inbox', 'message', or 'download'.",
          available_actions: ["create", "inbox", "message", "download"]
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