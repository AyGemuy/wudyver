import axios from "axios";
class ImageLabs {
  constructor() {
    this.baseUrl = "https://editor.imagelabs.net";
    this.headers = {
      "content-type": "application/json; charset=utf-8",
      accept: "application/json, text/javascript, */*; q=0.01",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async reprompt({
    prompt: promptText
  }) {
    try {
      console.log("Sending prompt to upgrade:", promptText);
      const response = await axios.post(`${this.baseUrl}/upgrade_prompt`, {
        prompt: promptText
      }, {
        headers: this.headers
      });
      console.log("Prompt response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error in prompt:", error.message);
      return {
        error: error.message
      };
    }
  }
  async create(data) {
    try {
      console.log("Creating image with data:", JSON.stringify(data, null, 2));
      const response = await axios.post(`${this.baseUrl}/txt2img`, data, {
        headers: this.headers
      });
      console.log("Image creation response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error in create:", error.message);
      return {
        error: error.message
      };
    }
  }
  async check(taskId) {
    try {
      console.log(`Checking progress for task ID: ${taskId}`);
      const response = await axios.post(`${this.baseUrl}/progress`, {
        task_id: taskId
      }, {
        headers: this.headers
      });
      console.log("Progress check response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error in check:", error.message);
      return {
        error: error.message
      };
    }
  }
  async poll(taskId) {
    const interval = 6e4;
    const timeout = 5 * interval;
    const startTime = Date.now();
    let result;
    try {
      console.log(`Polling started for task ID: ${taskId}`);
      while (Date.now() - startTime < timeout) {
        result = await this.check(taskId);
        if (result.status === "Done") {
          console.log("Task completed:", result);
          return result;
        }
        console.log("Task still processing, waiting 1 minute...");
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      console.log("Polling timed out after waiting for 5 minutes.");
      return {
        error: "Polling timed out"
      };
    } catch (error) {
      console.error("Error in polling:", error.message);
      return {
        error: error.message
      };
    }
  }
  async txt2img({
    prompt = "pemandangan indah",
    seed = 42,
    subseed = "",
    attention = "",
    width = 512,
    height = 512,
    tiling = false,
    negative_prompt = "",
    reference_image = "",
    reference_image_type = null,
    reference_strength = 30,
    ...opt
  }) {
    const randomSeed = seed || Math.floor(Math.random() * 1e10).toString();
    const randomSubseed = subseed || Math.floor(Math.random() * 1e10).toString();
    try {
      console.log("Starting image generation with prompt:", prompt);
      console.log("Using seed:", randomSeed, "and subseed:", randomSubseed);
      const createResponse = await this.create({
        prompt: prompt,
        seed: randomSeed,
        subseed: randomSubseed,
        attention: attention,
        width: width,
        height: height,
        tiling: tiling,
        negative_prompt: negative_prompt,
        reference_image: reference_image,
        reference_image_type: reference_image_type,
        reference_strength: reference_strength,
        ...opt
      });
      console.log("Image creation response:", createResponse);
      const pollResponse = await this.poll(createResponse.task_id);
      return pollResponse;
    } catch (error) {
      console.error("Error in generate:", error.message);
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
      error: "Missing required field: action",
      required: {
        action: "txt2img | reprompt"
      }
    });
  }
  const imglab = new ImageLabs();
  try {
    let result;
    switch (action) {
      case "reprompt":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await imglab[action](params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await imglab[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | reprompt`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}