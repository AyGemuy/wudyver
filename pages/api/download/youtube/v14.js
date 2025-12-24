import axios from "axios";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "POST" ? req.body : req.query;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const options = {
    method: "POST",
    url: "https://snap-video3.p.rapidapi.com/download",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-rapidapi-host": "snap-video3.p.rapidapi.com",
      "x-rapidapi-key": "35c9046f7cmshd2db25369e25f75p1cf84ejsn4d95e7ba9240"
    },
    data: new URLSearchParams({
      url: url
    })
  };
  try {
    const response = await axios(options);
    return res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch video data"
    });
  }
}