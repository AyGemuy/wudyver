import fetch from "node-fetch";
import FormData from "form-data";
class FaceSwapClient {
  constructor() {
    this.BASE_URL = "https://hap.ai-journey.dev";
  }
  async getBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) {
        console.log("Input: Buffer");
        return input;
      }
      if (typeof input === "string" && input.startsWith("data:")) {
        console.log("Input: Base64");
        const base64 = input.split(",")[1];
        return Buffer.from(base64, "base64");
      }
      if (typeof input === "string" && input.startsWith("http")) {
        console.log(`Downloading: ${input}`);
        const res = await fetch(input);
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      }
      throw new Error("Invalid input");
    } catch (err) {
      console.error(`getBuffer error: ${err.message}`);
      return null;
    }
  }
  async generate({
    prompt = "a stylish red evening dress",
    source,
    target
  }) {
    console.log("Starting generation...");
    console.log("Prompt:", prompt);
    try {
      const form = new FormData();
      const fullPrompt = `Keep the exact face, facial features, hair, hairstyle, skin tone, and identity from the uploaded model image. Generate a **complete full-body portrait** (head-to-toe, no cropping) of the person standing upright in realistic human proportions. The person must wear **${prompt}** covering the whole body appropriately (e.g., full outfit, dress, suit, etc.). Professional studio lighting, neutral solid background, ultra-high resolution, photorealistic, sharp focus, no half-body, no torso-only, no shirt-only, show feet and full legs.`;
      form.append("prompt", fullPrompt);
      console.log("Prompt set");
      const inputs = [{
        data: source,
        field: "image",
        name: "source"
      }, {
        data: target,
        field: "garment",
        name: "target"
      }];
      for (const {
          data,
          field,
          name
        }
        of inputs) {
        console.log(`Processing ${name}...`);
        const buffer = await this.getBuffer(data);
        if (!buffer) {
          console.error(`${name} failed to load`);
          return null;
        }
        form.append(field, buffer, {
          filename: `${name}.jpg`,
          contentType: "image/jpeg"
        });
        console.log(`${name} ready (${buffer.length} bytes)`);
      }
      console.log("Uploading to API...");
      const res = await fetch(`${this.BASE_URL}/headshot`, {
        method: "POST",
        body: form,
        headers: form.getHeaders()
      });
      console.log(`API: ${res.status} ${res.statusText}`);
      if (res.status !== 200 && res.status !== 201) {
        const errorText = await res.text();
        console.error("API failed:", errorText);
        return null;
      }
      const resultUrl = (await res.text()).trim();
      console.log("Result URL:", resultUrl);
      if (!resultUrl.match(/^https?:\/\/.+$/i)) {
        console.error("Invalid result URL format or empty string");
        return null;
      }
      console.log("Downloading result...");
      const finalBuffer = await this.getBuffer(resultUrl);
      if (!finalBuffer) {
        console.error("Failed to download final result buffer");
        return null;
      }
      console.log(`SUCCESS! Size: ${finalBuffer.length} bytes`);
      return finalBuffer;
    } catch (err) {
      console.error("generate() error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "source and target images are required"
    });
  }
  try {
    const api = new FaceSwapClient();
    const result = await api.generate(params);
    if (!result) {
      return res.status(500).json({
        error: "Image generation failed"
      });
    }
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}