import axios from "axios";
export default async function handler(req, res) {
  const {
    pfp = "https://default-image-url.com/default.png",
      username = "Anonymous",
      text = "Hello World"
  } = req.method === "GET" ? req.query : req.body;
  try {
    const imageResponse = await axios.get(pfp, {
      responseType: "arraybuffer"
    });
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(imageResponse.data);
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong!"
    });
  }
}