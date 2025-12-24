import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const response = await fetch("https://raw.githubusercontent.com/BadXyz/txt/main/citacita/citacita.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();
    const {
      id
    } = req.method === "GET" ? req.query : req.body;
    const index = id ? parseInt(id) - 1 : Math.floor(Math.random() * data.length);
    const selectedData = data[index];
    const audioResponse = await fetch(selectedData);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
    }
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    res.setHeader("Content-Type", "audio/mp3");
    return res.status(200).send(Buffer.from(audioArrayBuffer));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}