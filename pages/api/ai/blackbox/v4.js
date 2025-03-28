import axios from "axios";
export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  const encodedText = encodeURIComponent(text);
  const api1 = `https://zoro-foryou.vercel.app/api/blackbox?text=${encodedText}`;
  const api2 = `https://zoro-api-zoro-bot-5b28aebf.koyeb.app/api/blackbox?text=${encodedText}`;
  try {
    const response1 = await axios.get(api1);
    if (response1.data?.result) return res.json({
      result: response1.data.result
    });
    const response2 = await axios.get(api2);
    if (response2.data?.result) return res.json({
      result: response2.data.result
    });
    return res.status(500).json({
      error: "No result found"
    });
  } catch {
    return res.status(500).json({
      error: "Request failed"
    });
  }
}