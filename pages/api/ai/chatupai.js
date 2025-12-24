import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class ChatUpAI {
  constructor() {
    this.api = {
      base: "https://api.chatupai.org",
      endpoints: {
        completions: "/api/v1/completions",
        image: "/api/v1/auto-image-generate",
        browsing: "/api/v1/web-browsing",
        pdf2Text: "/api/v1/pdf-to-text"
      }
    };
    this.headers = {
      "User-Agent": "ChatUpAI-Client/1.3.0"
    };
    this.sessions = new Map();
    this.config = {
      maxMessages: 100,
      expiry: 3 * 60 * 60 * 1e3
    };
  }
  generateId() {
    return crypto.randomBytes(8).toString("hex");
  }
  cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.config.expiry) {
        this.sessions.delete(id);
        console.log(`Session with ID: ${id} has expired and was removed.`);
      }
    }
  }
  async chat({
    input,
    sessionId = null
  }) {
    if (typeof input !== "string" || !input.trim()) {
      return {
        success: false,
        error: {
          message: "Input message cannot be empty.",
          code: "INVALID_INPUT"
        }
      };
    }
    if (sessionId && !this.sessions.has(sessionId)) {
      return {
        success: false,
        error: {
          message: "Session ID not found or has expired. Please start a new session.",
          code: "SESSION_EXPIRED"
        }
      };
    }
    try {
      const isNewSession = !sessionId;
      const currentSessionId = sessionId || this.generateId();
      const previousMessages = this.sessions.get(currentSessionId)?.messages || [];
      const messages = [...previousMessages, {
        role: "user",
        content: input
      }];
      const payload = {
        messages: messages
      };
      const response = await axios.post(`${this.api.base}${this.api.endpoints.completions}`, payload, {
        headers: this.headers
      });
      const content = response.data?.data?.content || "Sorry, I could not provide a response.";
      const assistantMessage = {
        role: "assistant",
        content: content,
        timestamp: Date.now()
      };
      const updatedMessages = [...messages, assistantMessage];
      this.sessions.set(currentSessionId, {
        messages: updatedMessages.slice(-this.config.maxMessages),
        lastActive: Date.now()
      });
      setTimeout(() => this.cleanupSessions(), 0);
      return {
        success: true,
        code: 200,
        result: assistantMessage.content,
        sessionId: currentSessionId,
        sessionExpiry: new Date(Date.now() + this.config.expiry).toISOString(),
        isNewSession: isNewSession
      };
    } catch (error) {
      console.error("[ChatUpAI Class - chat method] API call failed:", error.message);
      return {
        success: false,
        error: {
          message: "An unexpected error occurred while processing the chat request.",
          code: "API_ERROR",
          details: error.response?.data || error.message
        }
      };
    }
  }
  async generateImage({
    prompt,
    n = 1,
    size = "1024x1024"
  }) {
    if (typeof prompt !== "string" || !prompt.trim()) {
      return {
        success: false,
        error: {
          message: "Image prompt cannot be empty.",
          code: "INVALID_INPUT"
        }
      };
    }
    try {
      const payload = {
        prompt: prompt,
        n: n,
        size: size
      };
      const response = await axios.post(`${this.api.base}${this.api.endpoints.image}`, payload, {
        headers: this.headers
      });
      if (!response.data.status || !response.data.data?.url) {
        throw new Error("Invalid response structure from image generation API.");
      }
      return {
        success: true,
        code: 200,
        content: response.data.data.content,
        imageUrl: response.data.data.url
      };
    } catch (error) {
      console.error("[ChatUpAI Class - generateImage method] API call failed:", error.message);
      return {
        success: false,
        error: {
          message: "Failed to generate the image.",
          code: "API_ERROR",
          details: error.response?.data || error.message
        }
      };
    }
  }
  async browsing({
    query
  }) {
    if (typeof query !== "string" || !query.trim()) {
      return {
        success: false,
        error: {
          message: "Web browsing query cannot be empty.",
          code: "INVALID_INPUT"
        }
      };
    }
    try {
      const messages = [{
        role: "user",
        content: query
      }];
      const payload = messages.length ? {
        messages: messages
      } : {};
      const response = await axios.post(`${this.api.base}${this.api.endpoints.browsing}`, payload, {
        headers: this.headers
      });
      const choices = response.data?.choices || {};
      const suggestions = response.data?.suggestion || [];
      return {
        success: true,
        code: 200,
        description: choices.Description || "",
        image: choices["Img-Prompt"] || "",
        urls: choices.Urls || [],
        suggestions: suggestions
      };
    } catch (error) {
      console.error("[ChatUpAI Class - browsing method] API call failed:", error.message);
      return {
        success: false,
        error: {
          message: "An error occurred during the web browsing request.",
          code: "API_ERROR",
          details: error.response?.data || error.message
        }
      };
    }
  }
  async pdf2Text({
    media,
    filename = "document.pdf"
  }) {
    let pdfBuffer;
    let finalFilename = filename;
    try {
      if (!media) {
        return {
          success: false,
          error: {
            message: "Media input for PDF cannot be empty.",
            code: "INVALID_INPUT"
          }
        };
      }
      if (typeof media === "string" && (media.startsWith("http://") || media.startsWith("https://"))) {
        const response = await axios.get(media, {
          responseType: "arraybuffer"
        });
        pdfBuffer = Buffer.from(response.data);
        const urlPath = new URL(media).pathname;
        const extractedFilename = urlPath.split("/").pop();
        if (extractedFilename) finalFilename = extractedFilename;
      } else if (Buffer.isBuffer(media)) {
        pdfBuffer = media;
      } else if (typeof media === "string") {
        const base64Data = media.startsWith("data:") ? media.substring(media.indexOf(",") + 1) : media;
        pdfBuffer = Buffer.from(base64Data, "base64");
      } else {
        return {
          success: false,
          error: {
            message: `Unsupported media type: ${typeof media}. Provide a URL, Buffer, or Base64 string.`,
            code: "UNSUPPORTED_TYPE"
          }
        };
      }
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Failed to create a valid PDF buffer from the provided media.");
      }
    } catch (processingError) {
      console.error("[ChatUpAI Class - pdf2Text method] Media processing failed:", processingError.message);
      return {
        success: false,
        error: {
          message: "Failed to process the provided media. Ensure the URL is accessible or the data is valid.",
          code: "MEDIA_PROCESSING_ERROR",
          details: processingError.message
        }
      };
    }
    try {
      const form = new FormData();
      form.append("pdf", pdfBuffer, {
        filename: finalFilename,
        contentType: "application/pdf"
      });
      const response = await axios.post(`${this.api.base}${this.api.endpoints.pdf2Text}`, form, {
        headers: {
          ...form.getHeaders(),
          ...this.headers
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      if (response.data?.status) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data?.error || "The API failed to extract text from the PDF.");
      }
    } catch (apiError) {
      console.error("[ChatUpAI Class - pdf2Text method] API call failed:", apiError.message);
      return {
        success: false,
        error: {
          message: "An error occurred while communicating with the PDF processing API.",
          code: "API_ERROR",
          details: apiError.response?.data || apiError.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!action) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Action parameter is required."
      }
    });
  }
  const api = new ChatUpAI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.input) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Paramenter 'input' is required for chat action."
            }
          });
        }
        response = await api.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Paramenter 'prompt' is required for image action."
            }
          });
        }
        response = await api.generateImage(params);
        break;
      case "browse":
        if (!params.query) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Paramenter 'query' is required for browse action."
            }
          });
        }
        response = await api.browsing(params);
        break;
      case "pdf2text":
        if (!params.media) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Paramenter 'media' is required for pdf2text action."
            }
          });
        }
        response = await api.pdf2Text(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid action: '${action}'. Supported actions are 'chat', 'image', 'browse', and 'pdf2text'.`
        });
    }
    if (response.success) {
      return res.status(200).json(response);
    } else {
      const errorCode = response.error?.code;
      let statusCode = 500;
      if (errorCode === "INVALID_INPUT" || errorCode === "UNSUPPORTED_TYPE") {
        statusCode = 400;
      } else if (errorCode === "SESSION_EXPIRED") {
        statusCode = 404;
      }
      return res.status(statusCode).json(response);
    }
  } catch (error) {
    console.error(`[API Handler Error][Action: ${action}]`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || "An unexpected internal server error occurred."
      }
    });
  }
}