import fetch from "node-fetch";
const AiArtGenerator = async (prompt, style = "3D Model", model = "sdxl-lightning") => {
  try {
    const response = await fetch("https://www.ai-art-generator.net/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user": "",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.ai-art-generator.net/playground"
      },
      body: JSON.stringify({
        prompt: prompt,
        style: style,
        model: model
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.text();
    const jsonData = JSON.parse(data);
    return jsonData.images;
  } catch (error) {
    console.error("Error in AiArtGenerator:", error);
    return null;
  }
};
export default async function handler(req, res) {
  const {
    prompt,
    style,
    model
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || style || model)) return res.status(400).json({
    message: "No prompt, style, model provided"
  });
  const result = await AiArtGenerator(prompt, style, model);
  Promise.resolve(result).then(() => {
    console.log("Query processing complete!");
  }).catch(error => {
    console.error("Error processing query:", error);
  });
  return res.status(200).json(typeof result === "object" ? result : result);
}