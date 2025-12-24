import axios from "axios";
const fetchData = async url => {
  try {
    const referer = new URL(url).origin;
    const response = await axios.get(url, {
      headers: {
        referer: referer,
        accept: "*/*"
      },
      responseType: "arraybuffer"
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching data: " + error.message);
  }
};
export default async function handler(req, res) {
  const {
    link,
    start,
    end
  } = req.method === "POST" ? req.body : req.query;
  if (!link || !start || !end) {
    return res.status(400).json({
      error: "Missing required parameters (link, start, end)."
    });
  }
  try {
    const response = await axios({
      method: "POST",
      url: "https://api.creatomate.com/v1/renders",
      headers: {
        Authorization: "Bearer 960789f9b7ea4a9b9311e7b35eb3d3b515492c525dd19f54b692ba3027d3c424d6d0595595a6ba8b368d8226fda382a6",
        "Content-Type": "application/json"
      },
      data: {
        source: {
          output_format: "mp4",
          elements: [{
            type: "video",
            source: link,
            trim_start: start,
            trim_duration: end
          }]
        }
      }
    });
    const videoUrl = response.data?.[0]?.url;
    if (!videoUrl) {
      return res.status(500).json({
        error: "Failed to process video cutting."
      });
    }
    const videoData = await fetchData(videoUrl);
    res.setHeader("Content-Type", "video/mp4");
    return res.status(200).send(Buffer.from(videoData));
  } catch (error) {
    return res.status(500).json({
      error: "Error processing video.",
      details: error.message
    });
  }
}