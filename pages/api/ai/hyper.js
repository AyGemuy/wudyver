import axios from "axios";
const extractData = input => {
  return input.split("\n").filter(line => line.startsWith("0")).map(line => {
    try {
      const json = JSON.parse(line.slice(2).trim());
      return json || "";
    } catch {
      return "";
    }
  }).join("").trim();
};
class HyperGenerate {
  async generate(prompt) {
    const url = "https://compute.hyper.space/api/generate";
    const headers = {
      "Content-Type": "application/json",
      "x-aios-nectar": "7R3H4EmXezEwyqN5WZCkJQvdCVthLfyUQXuAaWTNR3R7a1N3JQB4bfRQFj7tUtUzBT6dDXxhffbc3LykV4",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://compute.hyper.space/project/3b56406b-886d-49f7-975b-f8d738da1bab"
    };
    const data = {
      prompt: prompt
    };
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      const result = JSON.parse(extractData(response.data));
      return result;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "POST" ? req.body : req.query;
  if (!prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const result = await new HyperGenerate().generate(prompt);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}