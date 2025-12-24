import axios from "axios";
class StableHorde {
  constructor({
    apiKey = ""
  }) {
    this.api_key = apiKey || "0000000000";
    this.pending_text_generation_ids = [];
    this.pending_image_generation_ids = [];
    this.start_time = 0;
    this.api = axios.create({
      baseURL: "https://stablehorde.net/api/v2",
      headers: {
        apikey: this.api_key,
        "Content-Type": "application/json"
      },
      timeout: 125e3
    });
  }
  async status(id) {
    try {
      const response = await this.api.get(`/generate/status/${id}`);
      return response.data;
    } catch (error) {
      console.error("An error occurred:", error.message);
      return {
        error: error.message
      };
    }
  }
  async cancel_generate(id) {
    try {
      const response = await this.api.delete(`/generate/status/${id}`);
      return response.data;
    } catch (error) {
      console.error("An error occurred:", error.message);
      return {
        error: error.message
      };
    }
  }
  async check_generate(id) {
    try {
      const response = await this.api.get(`/generate/check/${id}`);
      return response.data;
    } catch (error) {
      console.error("An error occurred:", error.message);
      return {
        error: error.message
      };
    }
  }
  async models() {
    try {
      const response = await this.api.get("/status/models");
      return response.data;
    } catch (error) {
      console.error("An error occurred:", error.message);
      return {
        error: error.message
      };
    }
  }
  async styles() {
    try {
      const response = await axios.get("https://raw.githubusercontent.com/db0/Stable-Horde-Styles/main/styles.json");
      return response.data;
    } catch (error) {
      console.error("An error occurred:", error.message);
      return {
        error: error.message
      };
    }
  }
  async image_models() {
    return this.models();
  }
  async text_models() {
    return Promise.resolve(["koboldcpp/MythoMax-L2-13b", "aphrodite/Undi95/Emerhyst-20B", "aphrodite/Undi95/MXLewd-L2-20B", "aphrodite/Undi95/PsyMedRP-v1-20B", "koboldcpp/Emerhyst-20B.q6_k"]);
  }
  async chat(data_input) {
    try {
      const body = {
        prompt: data_input.prompt + (data_input.negative_prompt ? ` ### ${data_input.negative_prompt}` : ""),
        params: {
          ...data_input
        },
        models: [data_input.model]
      };
      const response = await this.api.post("/generate/text/async", body);
      const {
        id
      } = response.data;
      if (!id) {
        return {
          error: "Failed to get a generation ID."
        };
      }
      this.pending_text_generation_ids.push(id);
      this.start_time = Date.now();
      while (this.pending_text_generation_ids.length > 0) {
        if (Date.now() - this.start_time > 12e4) {
          console.warn("Text generation timeout.");
          break;
        }
        const status = await this.status(id);
        if (status.finished) {
          this.pending_text_generation_ids.shift();
          return status;
        }
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
      return await this.status(id);
    } catch (error) {
      console.error("An error occurred during text generation:", error.message);
      return {
        error: error.message
      };
    }
  }
  async image(data_input) {
    try {
      const body = {
        prompt: data_input.prompt + (data_input.negative_prompt ? ` ### ${data_input.negative_prompt}` : ""),
        params: {
          ...data_input,
          seed_variation: 1e3,
          post_processing: [],
          sampler_name: "k_euler",
          n: 1
        },
        nsfw: data_input.nsfw || false,
        censor_nsfw: !data_input.nsfw,
        slow_workers: true,
        worker_blacklist: false,
        models: [data_input.model],
        r2: true,
        shared: false
      };
      const response = await this.api.post("/generate/async", body);
      const {
        id
      } = response.data;
      if (!id) {
        return {
          error: "Failed to get a generation ID."
        };
      }
      this.pending_image_generation_ids.push(id);
      this.start_time = Date.now();
      while (this.pending_image_generation_ids.length > 0) {
        if (Date.now() - this.start_time > 12e4) {
          console.warn("Image generation timeout.");
          break;
        }
        const check = await this.check_generate(id);
        if (check.done) {
          this.pending_image_generation_ids.shift();
          return await this.status(id);
        }
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
      return await this.status(id);
    } catch (error) {
      console.error("An error occurred during image generation:", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new StableHorde();
  try {
    let response;
    switch (action) {
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt are required for image."
          });
        }
        response = await api.image(params);
        return res.status(200).json(response);
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt are required for chat."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      case "models":
        response = await api.models();
        return res.status(200).json(response);
      case "styles":
        response = await api.styles();
        return res.status(200).json(response);
      case "image_models":
        response = await api.image_models();
        return res.status(200).json(response);
      case "text_models":
        response = await api.text_models();
        return res.status(200).json(response);
      case "status":
        if (!params.id) {
          return res.status(400).json({
            error: "id is required for status."
          });
        }
        response = await api.status(params.id);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'image', 'chat', 'models', 'styles', 'image_models', 'text_models', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Handler Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}