import axios from "axios";
const baseUrl = "https://iseehf-hf-llm-api.hf.space";
const headers = {
  "Content-Type": "application/json"
};
async function getAvailableModels() {
  const url = `${baseUrl}/api/v1/models`;
  try {
    const response = await axios.get(url, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      throw new Error(error.message);
    }
  }
}
async function chatCompletions({
  prompt = "Hello, who are you?",
  model = "gpt-3.5-turbo",
  temperature = .5,
  top_p = .95,
  max_tokens = -1,
  use_cache = false,
  stream = false
}) {
  const url = `${baseUrl}/api/v1/chat/completions`;
  const payload = {
    model: model,
    messages: [{
      role: "user",
      content: prompt
    }],
    temperature: temperature,
    top_p: top_p,
    max_tokens: max_tokens,
    use_cache: use_cache,
    stream: stream
  };
  try {
    const response = await axios.post(url, payload, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 422) {
      throw new Error(`Error: ${error.response.data}`);
    } else if (error.response) {
      throw new Error(`Error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "chat",
      prompt = "Hello, who are you?",
      model = "gpt-3.5-turbo",
      temperature = .5,
      top_p = .95,
      max_tokens = -1,
      use_cache = false,
      stream = false
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "chat") {
      const result = await chatCompletions({
        prompt: prompt,
        model: model,
        temperature: temperature,
        top_p: top_p,
        max_tokens: max_tokens,
        use_cache: use_cache,
        stream: stream
      });
      return res.status(200).json({
        result: result
      });
    } else if (action === "models") {
      const models = await getAvailableModels();
      return res.status(200).json({
        models: models
      });
    } else {
      return res.status(400).json({
        error: "Invalid action parameter"
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}