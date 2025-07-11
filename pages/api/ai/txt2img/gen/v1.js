import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const apiUrl = `https://web-extracter.peterli.website/extract.php?prompt=${encodeURIComponent(prompt)}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error fetching image: ${response.statusText}`);
    }
    const data = await response.text();
    const dataJson = JSON.parse(data);
    if (dataJson.error) {
      return res.status(500).json({
        message: `Error: ${dataJson.error}`
      });
    }
    const imageBase64 = dataJson.result;
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(imageBase64, "base64"));
  } catch (error) {
    return res.status(500).json({
      message: "Error processing image",
      error: error.message
    });
  }
}