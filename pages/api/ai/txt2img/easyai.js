import axios from "axios";
class AieasypicApi {
  constructor() {
    this.baseUrl = "https://api.aieasypic.com/api";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://aieasypic.com/inspire/models/detail/v30-293564"
    };
  }
  async generate({
    model = 694648,
    can_split = false,
    batch_size = 2,
    prompt = "",
    controlnet_parameters = [],
    width = 768,
    height = 768,
    cfg_scale = "1.0",
    steps = 6,
    sampler_name = "Euler",
    lora_models = [774008],
    extra_json = {
      loras: [{
        id: 774008,
        weight: .125
      }]
    }
  } = {}) {
    try {
      const {
        data: jobData
      } = await axios.post(`${this.baseUrl}/inference_jobs/`, JSON.stringify({
        model: model,
        can_split: can_split,
        parameters: {
          batch_size: batch_size,
          prompt: prompt,
          controlnet_parameters: controlnet_parameters,
          width: width,
          height: height,
          cfg_scale: cfg_scale,
          steps: steps,
          sampler_name: sampler_name,
          lora_models: lora_models,
          extra_json: extra_json
        }
      }), {
        headers: this.headers
      });
      if (!jobData || !jobData.id) {
        throw new Error("Gagal membuat pekerjaan atau ID pekerjaan tidak ditemukan.");
      }
      const jobId = jobData.id;
      console.log(`Pekerjaan berhasil dibuat dengan ID: ${jobId}`);
      let jobStatus;
      while (true) {
        const {
          data: statusData
        } = await axios.get(`${this.baseUrl}/inference_jobs/${jobId}/success_detail/`, {
          headers: this.headers
        });
        jobStatus = statusData;
        const status = jobStatus.status;
        if (status === "R") {
          console.log(`Pekerjaan sedang berjalan: ${jobId}`);
        }
        if (status === "S" && jobStatus.prediction_images && jobStatus.prediction_images.length > 0) {
          return jobStatus;
        }
        console.log(`Status: ${status}. Prediction Images: ${jobStatus.prediction_images ? jobStatus.prediction_images.length : 0}. Mencoba lagi...`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new AieasypicApi();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}