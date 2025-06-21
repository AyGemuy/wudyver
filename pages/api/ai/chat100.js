import axios from "axios";
export default async function handler(req, res) {
  const url = "https://chat100.erweima.ai/api/v1/chat/gpt4o/chat";
  const headers = {
    authorization: "",
    "content-type": "application/json",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    uniqueid: "fa71d3714a76958526ada109236c6fd1",
    verify: ""
  };
  const data = {
    prompt: req.query.prompt || "bằng python, saya ingin mengirim requests dan menerima. apakah itu bisa?",
    sessionId: req.query.sessionId || "10cf66aa376682a9db57490a070d9f5e",
    attachments: [],
    location: req.query.location || {
      longitude: 126.6297,
      latitude: 10.8231,
      timezone_id: "Asia/Ho_Chi_Minh",
      locate: "Ho Chi Minh City, Vietnam"
    }
  };
  try {
    const response = await axios.post(url, data, {
      headers: headers
    });
    const rawData = response.data;
    const messages = rawData.split("\n").filter(chunk => chunk.trim().length > 0).map(chunk => {
      try {
        const parsed = JSON.parse(chunk);
        return parsed.data?.message || "";
      } catch {
        return "";
      }
    }).filter(msg => msg);
    return res.status(200).json({
      result: messages.join("")
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}