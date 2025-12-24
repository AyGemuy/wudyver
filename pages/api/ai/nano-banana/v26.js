import fetch from "node-fetch";
import FormData from "form-data";
class NanoBananaEditor {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || "AIzaSyBoAjfnKgIPYoO71kSUmTLLTaWGAsOr8NI",
      baseUrl: config.baseUrl || "https://us-central1-nano-banana-editor.cloudfunctions.net",
      projectId: config.projectId || "nano-banana-editor",
      timeout: config.timeout || 3e4,
      ...config
    };
    this._authCache = null;
    this._tokenExpiry = null;
    this.identityUrl = "https://identitytoolkit.googleapis.com/v1";
  }
  async _ensureAuth() {
    const now = Date.now();
    if (this._authCache && this._tokenExpiry && now < this._tokenExpiry - 5 * 60 * 1e3) {
      return this._authCache.idToken;
    }
    const res = await fetch(`${this.identityUrl}/accounts:signUp?key=${this.config.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Auth failed");
    }
    const data = await res.json();
    const expiresIn = parseInt(data.expiresIn, 10) * 1e3;
    this._authCache = {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      uid: data.localId
    };
    this._tokenExpiry = now + expiresIn;
    return data.idToken;
  }
  async processImageInput(imageInput) {
    if (typeof imageInput === "string") {
      if (imageInput.startsWith("http")) {
        const res = await fetch(imageInput);
        if (!res.ok) throw new Error("Failed to download image");
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else if (imageInput.startsWith("data:")) {
        const base64 = imageInput.split(",")[1];
        return Buffer.from(base64, "base64");
      } else {
        return Buffer.from(imageInput, "base64");
      }
    } else if (Buffer.isBuffer(imageInput)) {
      return imageInput;
    }
    throw new Error("Invalid image input");
  }
  processImageOutput(imageData) {
    if (typeof imageData === "string") {
      if (imageData.startsWith("data:")) {
        const base64 = imageData.split(",")[1];
        return Buffer.from(base64, "base64");
      } else {
        return Buffer.from(imageData, "base64");
      }
    } else if (Buffer.isBuffer(imageData)) {
      return imageData;
    }
    throw new Error("Invalid image output");
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    const isEdit = !!imageUrl;
    const endpoint = isEdit ? "/editImage" : "/generateImage";
    const url = `${this.config.baseUrl}${endpoint}`;
    const idToken = await this._ensureAuth();
    let fetchOptions;
    if (isEdit) {
      const formData = new FormData();
      formData.append("prompt", prompt);
      const imageBuffer = await this.processImageInput(imageUrl);
      formData.append("image", imageBuffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
      fetchOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...formData.getHeaders()
        },
        body: formData,
        timeout: this.config.timeout
      };
    } else {
      const payload = {
        prompt: prompt,
        ...rest
      };
      fetchOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        timeout: this.config.timeout
      };
    }
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API Error: ${res.status} - ${text}`);
    }
    const result = await res.json();
    const rawImage = result.image || result.data?.image;
    if (!rawImage) throw new Error("No image data in response");
    return this.processImageOutput(rawImage);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    prompt,
    imageUrl,
    ...rest
  } = params;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const api = new NanoBananaEditor();
    const imageBuffer = await api.generate({
      prompt: prompt,
      imageUrl: imageUrl,
      ...rest
    });
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Image generation error:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}