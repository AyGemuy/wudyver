import axios from "axios";
export default async function handler(req, res) {
  const {
    url,
    mode
  } = req.method === "POST" ? req.body : req.query;
  if (!url || !mode) {
    return res.status(400).json({
      error: "URL and mode are required"
    });
  }
  try {
    const response = await axios.post("https://c.blahaj.ca/", {
      url: url,
      downloadMode: mode
    }, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
    return res.status(200).json({
      data: response.data
    });
  } catch (error) {
    return res.status(error.response ? error.response.status : 500).json({
      error: error.message
    });
  }
}