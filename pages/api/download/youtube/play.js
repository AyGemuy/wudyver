import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    query,
    type = "mp3"
  } = req.method === "GET" ? req.query : req.body;
  if (!query || !type) {
    return res.status(400).json({
      error: 'Parameters "query" and "type" are required.'
    });
  }
  try {
    const searchResponse = await fetch(`https://wudysoft-down.hf.space/ytdl/search?query=${query}&limit=1`);
    const searchData = await searchResponse.json();
    if (!searchData.videos || searchData.videos.length === 0) {
      return res.status(404).json({
        error: "No videoss found."
      });
    }
    const videoId = searchData.videos[0].id;
    const downloadResponse = await fetch(`https://wudysoft-down.hf.space/ytdl?id=${videoId}`);
    const downloadData = await downloadResponse.json();
    if (!downloadData || !downloadData.data) {
      return res.status(500).json({
        error: "Failed to retrieve download data."
      });
    }
    const fileUrl = downloadData.data[0];
    if (type === "mp3") {
      res.setHeader("Content-Type", "audio/mp3");
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();
      res.send(Buffer.from(fileBuffer));
    } else if (type === "mp4") {
      res.setHeader("Content-Type", "video/mp4");
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();
      res.send(Buffer.from(fileBuffer));
    } else {
      res.status(400).json({
        error: 'Invalid type. Only "mp3" or "mp4" are supported.'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Something went wrong while processing the request."
    });
  }
}