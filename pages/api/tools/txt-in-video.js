import axios from "axios";
async function fetchData(url) {
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
    throw new Error("Error fetching video data: " + error.message);
  }
}
export default async function handler(req, res) {
  try {
    const {
      link,
      text1,
      text2
    } = req.method === "POST" ? req.body : req.query;
    if (!link || !text1 || !text2) return res.status(400).json({
      error: "❌ Please provide link, text1, and text2."
    });
    const response = await axios.post("https://api.creatomate.com/v1/renders", {
      template_id: "872df3b2-46fa-4547-b55c-190d92cceb99",
      modifications: {
        "ecf1a01d-ff16-4b5f-a58c-a4998b02e502": link,
        "Text-1": text1,
        "Text-2": text2
      }
    }, {
      headers: {
        Authorization: "Bearer 960789f9b7ea4a9b9311e7b35eb3d3b515492c525dd19f54b692ba3027d3c424d6d0595595a6ba8b368d8226fda382a6",
        "Content-Type": "application/json"
      }
    });
    if (!response.data[0]?.url) return res.status(500).json({
      error: "❌ Failed to generate video."
    });
    const videoUrl = response.data[0]?.url;
    const videoData = await fetchData(videoUrl);
    res.setHeader("Content-Type", "video/mp4");
    return res.status(200).send(Buffer.from(videoData));
  } catch (err) {
    res.status(500).json({
      error: "❌ Internal Server Error."
    });
  }
}