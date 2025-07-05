import fetch from "node-fetch";
const API_KEY = "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f";
const RAPIDAPI_HOST = "chatgpt-best-price.p.rapidapi.com";
export default async function handler(req, res) {
  const {
    prompt = "Describe this",
      input_url
  } = req.method === "GET" ? req.query : req.body;
  if (!input_url) {
    return res.status(400).json({
      error: "Input URL is required"
    });
  }
  const url = `https://${RAPIDAPI_HOST}/v1/chat/completions`;
  const options = {
    method: "POST",
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: prompt + "\n\n" + input_url
      }]
    })
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}