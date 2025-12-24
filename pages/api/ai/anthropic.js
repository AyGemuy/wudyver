import axios from "axios";
class AnthropicModel {
  constructor() {
    this.baseKey = "YzJzdFlXNTBMV0Z3YVRBekxXbDFOV3AxVlZwallVcFBPWFp2TFVkUlgyeHVNSHBGTVhaRmRTMUVkMEpoVjIxTVVGOWZla1JhTjNVeFUwMDBVRkJITFZwM1VWSXdOVmhITlRFelMycG1MWE5tYzFOeGJGSkNNelJpWTFkeVVWcEZNVFozTFRoWGJuZzFkMEZC";
    this.baseApi = "WVhCcExtRnVkR2h5YjNCcFl5NWpiMjA";
    this.anthropicVersion = "2023-06-01";
  }
  _decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
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
    if (!this.baseKey) {
      throw new Error("Kunci API tidak valid atau hilang. Pastikan instance AnthropicModel dibuat dengan kunci API yang valid.");
    }
    this.baseKey = this._decode(this._decode(this.baseKey));
    console.log(this.baseKey);
    let finalMessages;
    if (messages && Array.isArray(messages) && messages.length > 0) {
      finalMessages = messages;
    } else if (prompt) {
      finalMessages = [{
        role: "user",
        content: prompt
      }];
    } else {
      throw new Error("Paramenter 'messages' (array objek pesan) atau 'prompt' (string/array blok konten untuk pesan pengguna tunggal) harus disediakan.");
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
      this.baseApi = this._decode(this._decode(this.baseApi));
      const response = await axios.post(`https://${this.baseApi}/v1/messages`, requestBody, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.baseKey,
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