import axios from "axios";
import crypto from "crypto";
class MiraMuseAI {
  constructor() {
    this.baseUrl = "https://mjaiserver.erweima.ai";
    this.origin = "https://miramuseai.net";
    this.uniqueId = crypto.randomBytes(16).toString("hex");
    this.validModels = ["flux", "tamarin", "superAnime", "visiCanvas", "realistic", "oldRealistic", "anime", "3danime"];
    this.validSizes = ["1:2", "9:16", "3:4", "1:1", "4:3", "16:9", "2:1"];
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: this.origin,
        referer: `${this.origin}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        uniqueid: this.uniqueId,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log(`[Init] UniqueID: ${this.uniqueId}`);
  }
  validate(value, list, defaultValue) {
    return list.includes(value) ? value : defaultValue;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    const mode = imageUrl ? "image-to-image" : "text-to-image";
    const validatedPrompt = prompt || "";
    const validatedModel = this.validate(rest.model, this.validModels, "realistic");
    const validatedSize = this.validate(rest.size, this.validSizes, "3:4");
    console.log(`[Generate] Mode: ${mode}`);
    console.log(`[Generate] Prompt: ${validatedPrompt}`);
    console.log(`[Generate] Model: ${validatedModel}`);
    console.log(`[Generate] Size: ${validatedSize}`);
    const payload = {
      prompt: validatedPrompt,
      negativePrompt: rest.negativePrompt || "",
      model: validatedModel,
      size: validatedSize,
      batchSize: rest.batchSize || "1",
      imageUrl: imageUrl || "",
      rangeValue: rest.rangeValue || null
    };
    try {
      console.log("[Request] Generating...");
      const {
        data
      } = await this.axios.post("/api/v1/generate/generateMj", payload);
      const recordId = data?.data?.replace("-", "") || null;
      if (!recordId) throw new Error("No recordId received");
      console.log(`[Success] RecordID: ${recordId}`);
      return await this.poll(recordId);
    } catch (err) {
      console.error("[Error]", err?.message || err);
      throw err;
    }
  }
  async poll(recordId, maxAttempts = 60, interval = 3e3) {
    console.log(`[Poll] RecordID: ${recordId}`);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        console.log(`[Poll] Attempt ${i + 1}/${maxAttempts}`);
        const {
          data
        } = await this.axios.get("/api/midjourneyaiGenerateRecord/getRecordDetails", {
          params: {
            recordId: recordId
          }
        });
        const state = data?.data?.picState || "unknown";
        console.log(`[Poll] State: ${state}`);
        if (state === "success") {
          const picUrl = data?.data?.picUrl ? JSON.parse(data.data.picUrl) : [];
          const result = {
            result: picUrl,
            id: data?.data?.id,
            prompt: data?.data?.picPrompt,
            executedPrompt: data?.data?.picPromptExecuted,
            generateTime: data?.data?.generateTime,
            completeTime: data?.data?.generateCompleteTime,
            type: data?.data?.type,
            batchSize: data?.data?.batchSize,
            nsfwFlag: data?.data?.nsfwFlag,
            state: state
          };
          console.log("[Complete] Generation finished");
          return result;
        }
        if (state === "failed" || state === "error") {
          throw new Error(`Generation failed: ${data?.data?.failCode || "Unknown error"}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.error("[Poll Error]", err?.message || err);
        if (i === maxAttempts - 1) throw err;
      }
    }
    throw new Error("Polling timeout");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new MiraMuseAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}