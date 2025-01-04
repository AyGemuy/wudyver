import fetch from "node-fetch";
class ImageLabs {
  constructor() {
    this.baseUrl = "https://editor.imagelabs.net";
    this.headers = {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  async prompt(promptText) {
    try {
      const response = await fetch(`${this.baseUrl}/upgrade_prompt`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          prompt: promptText
        })
      });
      return response.ok ? await response.json() : {
        error: response.statusText
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async create(data) {
    try {
      const response = await fetch(`${this.baseUrl}/txt2img`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data)
      });
      return response.ok ? await response.json() : {
        error: response.statusText
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async check(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/progress`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          task_id: taskId
        })
      });
      return response.ok ? await response.json() : {
        error: response.statusText
      };
    } catch (error) {
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
    while (Date.now() - startTime < timeout) {
      result = await this.check(taskId);
      if (result.status === "Done") return result;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return {
      error: "Polling timed out"
    };
  }
  async gen(q) {
    const randomSeed = Math.floor(Math.random() * 1e10).toString();
    try {
      const createResponse = await this.create({
        prompt: q,
        seed: randomSeed,
        subseed: Math.floor(Math.random() * 1e10).toString(),
        attention: 0,
        width: 1024,
        height: 1344,
        tiling: false,
        negative_prompt: "",
        reference_image: "",
        reference_image_type: null,
        reference_strength: 30
      });
      const pollResponse = await this.poll(createResponse.task_id);
      return pollResponse;
    } catch (error) {
      console.error(error);
    }
  }
}
const imageLabs = new ImageLabs();
const imageLab = async q => {
  return await imageLabs.gen(q);
};
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await imageLab(prompt);
  return res.status(200).json(typeof result === "object" ? result : result);
}