import axios from "axios";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  const apiKey = "59f811c0086651b53056725c";
  const encodedUrl = encodeURIComponent(url);
  const requestUrl = `https://opengraph.io/api/1.1/site/${encodedUrl}?app_id=${apiKey}`;
  try {
    const response = await axios.get(requestUrl);
    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Internal server error";
    res.status(status).json({
      error: message
    });
  }
}