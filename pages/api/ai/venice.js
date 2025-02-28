import fetch from "node-fetch";
const extractImageData = async response => {
  try {
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};
const extractChatData = async response => {
  try {
    const text = await response.text();
    return text;
  } catch {
    return "Error processing chat response.";
  }
};
const sendImageRequest = async payload => {
  const url = "https://venice.ai/api/inference/image";
  const headers = {
    "Content-Type": "application/json",
    "X-Venice-Version": "20240907.194627",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    Referer: "https://venice.ai/chat/DDz1ZzxfuwvLcDPLkWOrE"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    return await extractImageData(response);
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};
const sendChatRequest = async payload => {
  const url = "https://venice.ai/api/inference/chat";
  const headers = {
    "Content-Type": "application/json",
    "X-Venice-Version": "20240907.194627",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    Referer: "https://venice.ai/chat/DDz1ZzxfuwvLcDPLkWOrE"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    return await extractChatData(response);
  } catch (error) {
    console.error("Error generating chat:", error);
    return "Error generating chat.";
  }
};
export default async function handler(req, res) {
  const {
    type,
    prompt,
    ...customPayload
  } = req.method === "GET" ? req.query : req.body;
  if (!type || !prompt) {
    return res.status(400).json({
      error: "Missing required prompt parameters: type or prompt"
    });
  }
  try {
    let result;
    if (type === "chat") {
      const chatPayload = {
        requestId: customPayload.requestId || "YmILofi",
        modelId: customPayload.modelId || "hermes-2-theta-web",
        prompt: [{
          content: prompt,
          role: customPayload.role || "user"
        }],
        systemPrompt: customPayload.systemPrompt || "",
        conversationType: customPayload.conversationType || "text",
        temperature: parseFloat(customPayload.temperature) || .8,
        topP: parseFloat(customPayload.topP) || .9
      };
      result = await sendChatRequest(chatPayload);
      if (!result) {
        return res.status(500).json({
          error: "Failed to generate chat response"
        });
      }
      return res.status(200).json({
        response: result
      });
    } else if (type === "image") {
      const imagePayload = {
        modelId: customPayload.modelId || "fluently-xl-final-akash",
        requestId: customPayload.requestId || "i27gFCH",
        prompt: prompt,
        seed: customPayload.seed || 20240908,
        negativePrompt: customPayload.negativePrompt || "",
        cfgScale: parseFloat(customPayload.cfgScale) || 5,
        aspectRatio: customPayload.aspectRatio || "1:1",
        width: parseInt(customPayload.width) || 1024,
        height: parseInt(customPayload.height) || 1024,
        customSeed: customPayload.customSeed || "random",
        steps: parseInt(customPayload.steps) || 30,
        isCustomSeed: customPayload.isCustomSeed === "true",
        isHighRes: customPayload.isHighRes === "true",
        safeVenice: customPayload.safeVenice !== "false",
        stylePreset: customPayload.stylePreset || "",
        hideWatermark: customPayload.hideWatermark === "true",
        favoriteImageStyles: customPayload.favoriteImageStyles ? JSON.parse(customPayload.favoriteImageStyles) : [],
        stylesTab: parseInt(customPayload.stylesTab) || 0
      };
      result = await sendImageRequest(imagePayload);
      if (!result) {
        return res.status(500).json({
          error: "Failed to generate image"
        });
      }
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result);
    } else {
      return res.status(400).json({
        error: "Invalid type parameter"
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}