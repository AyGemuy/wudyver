import fetch from "node-fetch";
async function AiImage(prompt, key = "RANDOM") {
  try {
    const createResponse = await fetch("https://aiimagegenerator.io/api/model/predict-peach", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        platform: "PC",
        product: "AI_IMAGE_GENERATOR",
        locale: "en-US",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://aiimagegenerator.io/"
      },
      body: JSON.stringify({
        prompt: prompt,
        negativePrompt: "",
        key: key,
        width: 512,
        height: 768,
        quantity: 1,
        size: "512x768"
      })
    });
    if (!createResponse.ok) {
      throw new Error(`HTTP error! Status: ${createResponse.status}`);
    }
    const createData = await createResponse.json();
    const taskId = createData.data;
    if (!taskId) {
      throw new Error("Failed to create task.");
    }
    const timeout = 6e4;
    const startTime = Date.now();
    let imageUrl = null;
    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1e4));
      try {
        const statusResponse = await fetch(`https://aiimagegenerator.io/api/model/status/${taskId}`);
        const statusData = await statusResponse.json();
        if (statusData.data?.url) {
          imageUrl = statusData.data.url;
          break;
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (imageUrl) {
      return imageUrl;
    } else {
      throw new Error("Failed to generate image within the timeout period.");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    key
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || key)) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await AiImage(prompt, key);
  Promise.resolve(result).then(() => {
    console.log("Query processing complete!");
  }).catch(error => {
    console.error("Error processing query:", error);
  });
  return res.status(200).json(typeof result === "object" ? result : result);
}