import axios from "axios";
export default async function handler(req, res) {
  try {
    const host = "https://quozio.com/";
    const {
      author,
      message,
      templateIndex = 0
    } = req.method === "POST" ? req.body : req.query;
    if (!author || !message) return res.status(400).json({
      error: "❌ Please provide both author and message."
    });
    const {
      data: {
        quoteId
      }
    } = await axios.post(`${host}api/v1/quotes`, {
      author: author,
      quote: message
    });
    const {
      data: {
        data: templates
      }
    } = await axios.get(`${host}api/v1/templates`);
    const template = templates[templateIndex];
    if (!template) return res.status(400).json({
      error: `❌ Invalid template index.`
    });
    const {
      data: {
        medium
      }
    } = await axios.get(`${host}api/v1/quotes/${quoteId}/imageUrls?templateId=${template.templateId}`);
    if (!medium) return res.status(500).json({
      error: "❌ Failed to generate quote image."
    });
    return res.status(200).json({
      imageUrl: medium,
      message: `Quote created successfully by *${author}*`
    });
  } catch (err) {
    res.status(500).json({
      error: "❌ Internal Server Error."
    });
  }
}