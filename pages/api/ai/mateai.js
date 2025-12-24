import axios from "axios";
const headers = {
  authority: "labs.writingmate.ai",
  accept: "*/*",
  "content-type": "application/json",
  origin: "https://labs.writingmate.ai",
  referer: "https://labs.writingmate.ai/share/JyVg?__show_banner=false",
  "user-agent": "Postify/1.0.0"
};
export default async function handler(req, res) {
  const {
    imageUrl,
    prompt = "Analyze this image and provide a detailed creative prompt not longer than 400 symbols."
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  const data = {
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_prompt",
        strict: true,
        schema: {
          type: "object",
          properties: {
            prompt: {
              type: "string"
            }
          },
          required: ["prompt"],
          additionalProperties: false
        }
      }
    },
    chatSettings: {
      model: "gpt-4o-mini",
      temperature: .7,
      contextLength: 16385,
      includeProfileContext: false,
      includeWorkspaceInstructions: false,
      embeddingsProvider: "openai"
    },
    messages: [{
      role: "user",
      content: [{
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      }, {
        type: "text",
        text: prompt
      }]
    }],
    customModelId: ""
  };
  try {
    const response = await axios.post("https://labs.writingmate.ai/api/chat/public", data, {
      headers: headers
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}