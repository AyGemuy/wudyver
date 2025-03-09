import axios from "axios";
import {
  FormData
} from "formdata-node";
async function polybuzzAi(prompt, selectId = "98399308486") {
  const formData = new FormData();
  formData.append("currentChatStyleId", "1");
  formData.append("mediaType", "2");
  formData.append("needLive2D", "2");
  formData.append("secretSceneId", "wHp7z");
  formData.append("selectId", selectId);
  formData.append("speechText", prompt);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    Cookie: "session=9997156d23496b9ff96fc09d162191f74821790eaa4ecc52096273a60f517ad3"
  };
  try {
    const {
      data: response
    } = await axios.post("https://api.polybuzz.ai/api/conversation/msgbystream", formData, {
      headers: headers
    });
    const result = response.split("\n").filter(line => line.trim()).map(line => {
      try {
        const json = JSON.parse(line.trim());
        return json.content || "";
      } catch (e) {
        console.error("Invalid JSON:", line);
        return "";
      }
    }).join("");
    return result;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    selectId
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const response = await polybuzzAi(prompt, selectId);
    if (response) {
      return res.status(200).json({
        result: response
      });
    } else {
      return res.status(500).json({
        error: "Failed to retrieve data from PolyBuzz API"
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}