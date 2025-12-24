import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt: your_qus,
    system
  } = req.method === "GET" ? req.query : req.body;
  if (!your_qus) {
    return res.status(400).json({
      error: "Your question (prompt) is required"
    });
  }
  try {
    let linkaiList = [],
      Baseurl = "https://c3.a0.chat/";
    linkaiList.push({
      content: your_qus,
      role: "user"
    });
    linkaiList.push({
      content: system || "Saya AI dari OpenAI, diciptakan untuk membantu Anda mengeksplorasi ide, bertukar informasi, dan menyelesaikan masalah. Ada yang bisa saya bantu?",
      role: "system"
    });
    if (linkaiList.length > 10) linkaiList.shift();
    const response = await axios.post(Baseurl + "v1/chat/gpt/", {
      list: linkaiList
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": Array.from({
          length: 4
        }, () => Math.floor(256 * Math.random())).join("."),
        Referer: Baseurl + "#/web/chat",
        Accept: "application/json, text/plain, */*"
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Error occurred during GPT-3 request"
    });
  }
}