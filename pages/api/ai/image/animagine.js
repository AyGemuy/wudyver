import axios from "axios";
import EventSource from "eventsource";
const API_BASE = "https://cagliostrolab-animagine-xl-3-1.hf.space";
const DEFAULT_NEGATIVE_PROMPT = "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck";
const headers = {
  "content-type": "application/json",
  accept: "*/*",
  origin: API_BASE,
  referer: `${API_BASE}/?__theme=light`,
  "user-agent": "Postify/1.0.0"
};
const session_hash = () => Math.random().toString(36).slice(2);
const animagine = {
  create: async (prompt = "Cat Anime Cutest", negativePrompt = DEFAULT_NEGATIVE_PROMPT, seed = 739522995, width = 1024, height = 1024, guidanceScale = 7, numInferenceSteps = 28, sampler = "Euler a", aspectRatio = "896 x 1152", stylePreset = "Anime", qualityTags = "Standard v3.1", useUpscaler = true, strength = .55, upscaleBy = 1.5, addQualityTags = true) => {
    const sh = session_hash();
    const payload = {
      data: [prompt, negativePrompt, seed, width, height, guidanceScale, numInferenceSteps, sampler, aspectRatio, stylePreset, qualityTags, useUpscaler, strength, upscaleBy, addQualityTags],
      fn_index: 5,
      trigger_id: 49,
      session_hash: sh
    };
    try {
      const {
        data
      } = await axios.post(`${API_BASE}/queue/join?__theme=light`, payload, {
        headers: headers
      });
      if (!data.event_id) throw new Error("No Event ID found");
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE}/queue/data?session_hash=${sh}`);
        eventSource.onmessage = ({
          data
        }) => {
          const message = JSON.parse(data);
          if (message.msg === "progress") {
            const progress = message.progress_data?.[0];
            if (progress) process.stdout.write(`\r🟢 Progress: ${((progress.index + 1) / progress.length * 100).toFixed(0)}%`);
          }
          if (message.msg === "process_completed") {
            eventSource.close();
            console.log("\n✅ Gambar berhasil digenerate.");
            resolve(message.output.data[0].map(({
              image
            }) => image.url));
          }
        };
        eventSource.onerror = err => {
          eventSource.close();
          reject(new Error(err.message));
        };
      });
    } catch (error) {
      console.error(error.response?.data || error.message);
      throw error;
    }
  }
};
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      prompt,
      negativePrompt,
      seed,
      width,
      height,
      guidanceScale,
      numInferenceSteps,
      sampler,
      aspectRatio,
      stylePreset,
      qualityTags,
      useUpscaler,
      strength,
      upscaleBy,
      addQualityTags
    } = req.method === "GET" ? req.query : req.body;
    try {
      const result = await animagine.create(prompt || "Cat Anime Cutest", negativePrompt || DEFAULT_NEGATIVE_PROMPT, seed || 739522995, width || 1024, height || 1024, guidanceScale || 7, numInferenceSteps || 28, sampler || "Euler a", aspectRatio || "896 x 1152", stylePreset || "Anime", qualityTags || "Standard v3.1", useUpscaler === "true", strength || .55, upscaleBy || 1.5, addQualityTags === "true");
      Promise.resolve(result).then(() => {
        console.log("Query processing complete!");
      }).catch(error => {
        console.error("Error processing query:", error);
      });
      return res.status(200).json({
        images: result
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}