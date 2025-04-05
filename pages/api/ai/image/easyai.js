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
  async createInferenceJob({
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
        data
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
      return data;
    } catch (error) {
      throw new Error("Error creating job: " + error.message);
    }
  }
  async getInferenceJobStatus(jobId) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/inference_jobs/${jobId}/success_detail/`, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error("Error fetching job status: " + error.message);
    }
  }
  async pollJobStatus(jobId, interval = 3e3) {
    let status = "";
    while (status !== "S") {
      const jobStatus = await this.getInferenceJobStatus(jobId);
      status = jobStatus.status;
      if (status === "R") console.log(`Job is running: ${jobStatus.id}`);
      if (status === "S") return jobStatus;
      console.log(`Status: ${status}. Retrying in ${interval / 1e3}s...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
export default async function handler(req, res) {
  try {
    const api = new AieasypicApi();
    const {
      prompt,
      model,
      can_split,
      batch_size,
      controlnet_parameters,
      width,
      height,
      cfg_scale,
      steps,
      sampler_name,
      lora_models,
      extra_json
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) return res.status(400).json({
      error: "Prompt tidak boleh kosong"
    });
    const response = await api.createInferenceJob({
      prompt: prompt,
      model: model,
      can_split: can_split,
      batch_size: batch_size,
      controlnet_parameters: controlnet_parameters,
      width: width,
      height: height,
      cfg_scale: cfg_scale,
      steps: steps,
      sampler_name: sampler_name,
      lora_models: lora_models,
      extra_json: extra_json
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}