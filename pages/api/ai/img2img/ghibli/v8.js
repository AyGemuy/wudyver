import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GhibliAI {
  constructor() {
    this.baseUrl = "https://ghibli-ai-generator.net";
    this.generateEndpoint = "/api/4o-image/generate/";
    this.statusEndpoint = "/api/4o-image/status/";
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  buildHeaders(extra = {}) {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: this.baseUrl,
      priority: "u=1, i",
      referer: `${this.baseUrl}/ghibli-image-generator/`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead(),
      ...extra
    };
  }
  async generate({
    imageUrl,
    prompt = this.getRandomPrompt(),
    size = "1:1"
  }) {
    console.log(`[img2img] Memulai proses img2img untuk URL: ${imageUrl}, Prompt: "${prompt}", Size: ${size}`);
    let taskId = null;
    try {
      const generatePayload = {
        prompt: prompt,
        filesUrl: [imageUrl],
        size: size
      };
      console.log("[img2img] Mengirim permintaan generasi gambar ke /api/4o-image/generate/ dengan:", generatePayload);
      const generateResponse = await axios.post(`${this.baseUrl}${this.generateEndpoint}`, generatePayload, {
        headers: this.buildHeaders({
          "content-type": "application/json"
        })
      });
      console.log("---");
      console.log("[img2img] Generate Response (Asli):", generateResponse.data);
      console.log("---");
      if (generateResponse.data.code !== 200 || !generateResponse.data.data || !generateResponse.data.data.taskId) {
        throw new Error(`Failed to initiate image generation: ${generateResponse.data.msg || "Unknown error"}`);
      }
      taskId = generateResponse.data.data.taskId;
      console.log(`[img2img] Permintaan generasi diterima. Task ID: ${taskId}`);
      const timeout = 36e5;
      const startTime = Date.now();
      let pollingAttempts = 0;
      const maxPollingAttempts = 60;
      console.log(`[img2img] Memulai polling status untuk Task ID: ${taskId}`);
      while (true) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > timeout) {
          throw new Error("Generation timeout: Polling timed out after 1 hour.");
        }
        if (pollingAttempts >= maxPollingAttempts) {
          throw new Error("Generation timeout: Max polling attempts reached.");
        }
        console.log(`[img2img] Checking task status for Task ID: ${taskId}, Attempt: ${pollingAttempts + 1}...`);
        const statusResponse = await axios.get(`${this.baseUrl}${this.statusEndpoint}?taskId=${taskId}`, {
          headers: this.buildHeaders({
            "content-type": undefined
          })
        });
        console.log("---");
        console.log("Status Response Data (Asli):", statusResponse.data);
        console.log("---");
        const p = statusResponse.data;
        if (p.code !== 200 || !p.data) {
          console.warn("[img2img] Struktur respons status tidak terduga atau error, mencoba lagi...");
          await new Promise(resolve => setTimeout(resolve, 2e3));
          pollingAttempts++;
          continue;
        }
        const {
          status,
          progress,
          response,
          errorMessage,
          errorCode,
          successFlag
        } = p.data;
        if (status === "SUCCESS" || successFlag === 1) {
          let resultUrls = response && response.resultUrls || [];
          if (resultUrls.length > 0) {
            const imageUrlResult = resultUrls[0];
            console.log("[img2img] Generation completed! Image URL:", imageUrlResult);
            return {
              imageUrl: imageUrlResult,
              status: status,
              progress: 100
            };
          }
          throw new Error("No image URL found in successful generation response.");
        }
        if (status && (status.toLowerCase() === "failed" || errorCode !== null)) {
          const failureMessage = errorMessage || `Generation failed with code ${errorCode || "N/A"}`;
          console.error(`[img2img] Image generation failed with status "${status}": ${failureMessage}`);
          throw new Error(`Image generation failed: ${failureMessage}`);
        }
        if (progress) {
          const currentProgress = parseFloat(progress) * 100;
          console.log(`[img2img] Generating image: ${currentProgress.toFixed(2)}% (Status: ${status || "IN_PROGRESS"})`);
        } else {
          console.log(`[img2img] Task in progress (no progress info), Status: ${status || "UNKNOWN"}`);
        }
        console.log("[img2img] Task in progress, waiting 2 seconds before next poll...");
        await new Promise(resolve => setTimeout(resolve, 2e3));
        pollingAttempts++;
      }
    } catch (error) {
      console.error(`[img2img] Error during image generation: ${error.message || error}`);
      throw new Error("Error generating image: " + (error.message || error));
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibli = new GhibliAI();
  try {
    const data = await ghibli.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}