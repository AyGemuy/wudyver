import axios from "axios";
class Julius {
  constructor(token = "null") {
    this.token = token;
    this.url = "https://playground.julius.ai/api/chat/message";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      authorization: `Bearer ${this.token}`,
      "conversation-id": "7c300583-c779-4a7b-a9dd-3c2bbf91835c",
      "cypress-test-id": "d0eab267",
      "ga-client-id": "1666071799.1735606552",
      gcs: "true",
      "interactive-charts": "true",
      "is-demo": "temp_cc14653b-81cf-49c5-aea4-aac129e78e67",
      "is-native": "false",
      platform: "web",
      priority: "u=1, i",
      "request-id": "undefined",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "use-dict": "true",
      "visitor-id": "undefined",
      Referer: "https://julius.ai/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }
  async chat({
    payload
  }) {
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const responses = response.data.split("\n").filter(line => {
        try {
          const json = JSON.parse(line);
          return json.content && json.content;
        } catch {
          return false;
        }
      }).map(line => JSON.parse(line)?.content).join("");
      return responses;
    } catch (error) {
      throw new Error("Failed to fetch chat response: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  try {
    let payload;
    if (req.body && Object.keys(req.body).length > 0) {
      payload = req.body;
    } else if (req.query && Object.keys(req.query).length > 0) {
      payload = {
        message: {
          content: req.query.message || "Hy"
        },
        provider: req.query.provider || "default",
        chat_mode: req.query.chat_mode || "auto",
        client_version: req.query.client_version || "20240130",
        theme: req.query.theme || "dark",
        new_images: req.query.new_images || null,
        new_attachments: req.query.new_attachments || null,
        dataframe_format: req.query.dataframe_format || "json",
        selectedModels: req.query.selectedModels ? [req.query.selectedModels] : ["GPT-4o mini"]
      };
    }
    if (!payload) {
      return res.status(400).json({
        error: "Payload is missing"
      });
    }
    const julius = new Julius();
    const chatResponse = await julius.chat({
      payload: payload
    });
    return res.status(200).json({
      result: chatResponse
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}