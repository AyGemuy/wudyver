import fetch from "node-fetch";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
const API_KEY = "AIzaSyDy2K9LXI3-DmvqdaW6F55DpmO9D7MR9YU";
const BASE_URL = "https://api.getmorphai.com";
const FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signUp";
const FIREBASE_REFRESH_URL = "https://securetoken.googleapis.com/v1/token";
class MorphAI {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
  }
  l(msg) {
    console.log(`[MorphAI] ${msg}`);
  }
  isTokenExpired() {
    return this.tokenExpiry < Date.now() + 5 * 60 * 1e3;
  }
  async refreshAuth() {
    if (!this.refreshToken) {
      this.l("Refresh: No refresh token available.");
      return false;
    }
    this.l("Refresh: Starting token refresh...");
    try {
      const res = await fetch(`${FIREBASE_REFRESH_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Token refresh failed");
      this.token = data.id_token;
      this.refreshToken = data.refresh_token || this.refreshToken;
      const expiresInMs = parseInt(data.expires_in, 10) * 1e3;
      this.tokenExpiry = Date.now() + expiresInMs;
      this.l("Refresh: Success");
      return true;
    } catch (e) {
      this.l(`Refresh error: ${e.message}`);
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = 0;
      return false;
    }
  }
  async auth() {
    if (this.token && !this.isTokenExpired()) {
      this.l("Auth: Token is valid.");
      return this.token;
    }
    if (this.token && this.refreshToken && this.isTokenExpired()) {
      this.l("Auth: Token expired, attempting refresh...");
      const refreshed = await this.refreshAuth();
      if (refreshed) return this.token;
    }
    try {
      this.l("Auth: Starting anonymous sign-in...");
      const res = await fetch(`${FIREBASE_AUTH_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          returnSecureToken: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Auth failed");
      this.token = data.idToken;
      this.refreshToken = data.refreshToken;
      const expiresInMs = parseInt(data.expiresIn, 10) * 1e3;
      this.tokenExpiry = Date.now() + expiresInMs;
      this.l("Auth: Success");
      return this.token;
    } catch (e) {
      this.l(`Auth error: ${e.message}`);
      throw e;
    }
  }
  async dl(url) {
    try {
      this.l(`Download: Fetching ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    } catch (e) {
      this.l(`Download failed: ${e.message}`);
      throw e;
    }
  }
  async img(file) {
    if (!file) return null;
    try {
      if (typeof file === "string") {
        if (file.startsWith("http")) return await this.dl(file);
        if (file.startsWith("data:")) {
          const b64 = file.split(",")[1];
          return Buffer.from(b64, "base64");
        }
      }
      if (Buffer.isBuffer(file)) return file;
      throw new Error("Invalid image format");
    } catch (e) {
      this.l(`Image prep failed: ${e.message}`);
      throw e;
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    try {
      await this.auth();
      const hasImage = !!imageUrl;
      const mode = hasImage ? "Image-to-Image" : "Text-to-Image";
      this.l(`Mode: ${mode}`);
      const form = new FormData();
      form.append("prompt", prompt || "");
      if (hasImage) {
        const imgBuf = await this.img(imageUrl);
        if (!imgBuf) throw new Error("Failed to process image");
        form.append("image", imgBuf, {
          filename: "input.png",
          contentType: "image/png"
        });
        this.l("Image: Attached");
      }
      if (rest.image_prompt) {
        const ipBuf = await this.img(rest.image_prompt);
        if (ipBuf) {
          form.append("image_prompt", ipBuf, {
            filename: "prompt.png",
            contentType: "image/png"
          });
          this.l("Image Prompt: Attached");
        }
      }
      this.l("Sending request to MorphAI...");
      const res = await fetch(`${BASE_URL}/transform`, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.token}`
        },
        body: form
      });
      const txt = await res.text();
      if (!res.ok) {
        this.l(`API error ${res.status}: ${txt}`);
        let errMsg = "Unknown error";
        try {
          const err = JSON.parse(txt);
          errMsg = err.detail || err.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      let json;
      try {
        json = JSON.parse(txt);
      } catch (e) {
        throw new Error("Invalid JSON response");
      }
      const url = json.image_url || json.output?.[0] || "";
      if (!url) throw new Error("No image_url in response");
      this.l(`Success! Result: ${url}`);
      return json;
    } catch (e) {
      this.l(`Generate failed: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Input 'imageUrl' wajib diisi."
    });
  }
  try {
    const api = new MorphAI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Terjadi kesalahan pada API:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}