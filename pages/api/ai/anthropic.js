import axios from "axios";
class AnthropicModel {
  constructor(apiKey = "c2stYW50LWFwaTAzLWl1NWp1VVpjYUpPOXZvLUdRX2xuMHpFMXZFdS1Ed0JhV21MUF9fekRaN3UxU000UFBHLVp3UVIwNVhHNTEzS2pmLXNmc1NxbFJCMzRiY1dyUVpFMTZ3LThXbng1d0FB") {
    if (!apiKey) {
      throw new Error("Kunci API Anthropic diperlukan saat membuat instance AnthropicModel.");
    }
    this.apiKey = apiKey;
    this.anthropicVersion = "2023-06-01";
  }
  _decodeBase64(encodedString) {
    return atob(encodedString);
  }
  async chat({
    model = "claude-3-opus-20240229",
    prompt,
    messages,
    max_tokens = 1024,
    system,
    temperature,
    top_p,
    top_k,
    stream = false
  }) {
    if (!this.apiKey) {
      throw new Error("Kunci API tidak valid atau hilang. Pastikan instance AnthropicModel dibuat dengan kunci API yang valid.");
    }
    this.apiKey = this._decodeBase64(this.apiKey);
    console.log(this.apiKey);
    let finalMessages;
    if (messages && Array.isArray(messages) && messages.length > 0) {
      finalMessages = messages;
    } else if (prompt) {
      finalMessages = [{
        role: "user",
        content: prompt
      }];
    } else {
      throw new Error("Parameter 'messages' (array objek pesan) atau 'prompt' (string/array blok konten untuk pesan pengguna tunggal) harus disediakan.");
    }
    const requestBody = {
      model: model,
      max_tokens: max_tokens,
      messages: finalMessages
    };
    if (system !== undefined) requestBody.system = system;
    if (temperature !== undefined) requestBody.temperature = temperature;
    if (top_p !== undefined) requestBody.top_p = top_p;
    if (top_k !== undefined) requestBody.top_k = top_k;
    if (stream) requestBody.stream = true;
    try {
      const response = await axios.post("https://api.anthropic.com/v1/messages", requestBody, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.anthropicVersion
        },
        responseType: stream ? "stream" : "json"
      });
      return response.data;
    } catch (error) {
      let errorMessage = "Anthropic API Error. ";
      if (error.response) {
        errorMessage += `Status: ${error.response.status}. `;
        if (error.response.data) {
          errorMessage += `Data: ${JSON.stringify(error.response.data)}`;
        } else {
          errorMessage += `Response body empty.`;
        }
      } else if (error.request) {
        errorMessage += "No response received from Anthropic API.";
      } else {
        errorMessage += `Message: ${error.message}`;
      }
      throw new Error(errorMessage);
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
    const ai = new AnthropicModel();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}