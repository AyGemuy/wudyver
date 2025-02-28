import axios from "axios";
export default async function handler(req, res) {
  const method = req.method;
  const {
    prompt = "Daffa",
      font_text = "100",
      blur_level = "5"
  } = method === "GET" ? req.query : req.body;
  const url = "https://www.bestcalculators.org/wp-admin/admin-ajax.php";
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "User-Agent": "Postify/1.0.0",
    "X-Requested-With": "XMLHttpRequest"
  };
  const body = {
    action: "generate_brat_text",
    text: prompt,
    fontSize: font_text,
    blurLevel: blur_level
  };
  try {
    const response = await axios.post(url, body, {
      headers: headers
    });
    return res.status(200).send(response.data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate text response"
    });
  }
}