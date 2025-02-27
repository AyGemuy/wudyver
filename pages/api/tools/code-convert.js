import axios from "axios";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    code,
    lang,
    to
  } = req.body;
  if (!code || !lang || !to) {
    return res.status(400).json({
      error: "Missing required fields: code, lang, or to"
    });
  }
  const url = "https://www.codeconvert.ai/api/free-convert";
  const headers = {
    Host: "www.codeconvert.ai",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Accept: "*/*",
    Origin: "https://www.codeconvert.ai",
    Referer: "https://www.codeconvert.ai/python-to-javascript-converter",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
  };
  const data = {
    inputCodeText: code,
    inputLang: lang,
    outputLang: to,
    customInstruction: ""
  };
  try {
    const response = await axios.post(url, data, {
      headers: headers
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    console.error("Error converting code:", error.message);
    return res.status(500).json({
      error: "Failed to convert code",
      details: error.message
    });
  }
}