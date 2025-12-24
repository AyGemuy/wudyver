import axios from "axios";
export default async function handler(req, res) {
  const input = req.method === "POST" ? req.body : req.query;
  const {
    data,
    password = "",
    expired = "never",
    language = null,
    name = ""
  } = input;
  if (!data) return res.status(400).json({
    error: 'Missing required "data" field'
  });
  const baseURL = "https://paste.zone-xsec.com/";
  try {
    const response = await axios.post("https://paste.zone-xsec.com/post", data, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "text/plain",
        options: JSON.stringify({
          password: password,
          expired: expired,
          language: language,
          name: name
        }),
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://paste.zone-xsec.com/"
      }
    });
    const result = response.data;
    result.path = `${baseURL}raw/${result.path}`;
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}