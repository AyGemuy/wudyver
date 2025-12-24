import axios from "axios";
class Phind {
  constructor() {
    this.url = "https://https.extension.phind.com/agent/";
  }
  async chat(prompt, systemPrompt = "Be Helpful and Friendly", model = "Phind Model") {
    prompt.unshift({
      role: "system",
      content: systemPrompt
    });
    const payload = {
      additional_extension_context: "",
      allow_magic_buttons: true,
      is_vscode_extension: true,
      message_history: prompt,
      requested_model: model,
      user_input: prompt[prompt.length - 1].content
    };
    const headers = {
      "content-type": "application/json",
      "user-agent": "",
      accept: "*/*",
      "accept-encoding": "identity"
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: headers
      });
      const rawData = response.data;
      const result = rawData.split("\n").filter(line => line.trim().startsWith("data:")).map(line => JSON.parse(line.slice(5).trim())).map(item => item.choices && item.choices[0].delta.content).join("");
      return result;
    } catch (error) {
      console.error(error);
      throw new Error("Error in chat request");
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const prompt = method === "GET" ? req.query.prompt : req.body.prompt;
  const systemPrompt = method === "GET" ? req.query.systemPrompt : req.body.systemPrompt;
  const model = method === "GET" ? req.query.model : req.body.model;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const phind = new Phind();
  try {
    const result = await phind.chat([{
      role: "user",
      content: prompt
    }], systemPrompt, model);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}