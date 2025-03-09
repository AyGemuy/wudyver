import fetch from "node-fetch";
const API_URL = "https://cococlip.ai/api/v1";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  Referer: "https://cococlip.ai/features/image-to-prompt"
};
const TIMEOUT = 12e4;
const POLL_INTERVAL = 2e3;
async function cococlip(imageUrl) {
  try {
    const response1 = await fetch(`${API_URL}/imagetoprompt/imageclip?image=${encodeURIComponent(imageUrl)}`, {
      method: "GET",
      headers: HEADERS
    });
    const {
      id: promptId
    } = await response1.json();
    if (!promptId) throw new Error("Failed to retrieve promptId");
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUT) {
      const response2 = await fetch(`${API_URL}/checkqueue?promptId=${promptId}`, {
        method: "GET",
        headers: HEADERS
      });
      const {
        nums
      } = await response2.json();
      if (nums === 0) {
        const response3 = await fetch(`${API_URL}/imagetoprompt/imageclippoll?promptId=${promptId}`, {
          method: "GET",
          headers: HEADERS
        });
        const {
          prompt
        } = await response3.json();
        if (prompt) return prompt;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error("Polling timed out for final result");
  } catch (error) {
    console.error("Error in getImagePrompt:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await cococlip(url);
  Promise.resolve(result).then(() => {
    console.log("Query processing complete!");
  }).catch(error => {
    console.error("Error processing query:", error);
  });
  return res.status(200).json(typeof result === "object" ? result : result);
}