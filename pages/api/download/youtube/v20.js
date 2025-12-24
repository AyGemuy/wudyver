import axios from "axios";
const decodeUrl = encodedArray => String.fromCharCode(...encodedArray);
export default async function handler(req, res) {
  const {
    url,
    quality = "128kbps",
    type = "audio"
  } = req.query;
  if (!url || !type) return res.status(400).json({
    result: {
      error: "URL and type are required."
    }
  });
  const encodedUrl = [104, 116, 116, 112, 115, 58, 47, 47, 121, 116, 100, 108, 46, 97, 120, 101, 101, 108, 46, 109, 121, 46, 105, 100];
  const decodedUrl = decodeUrl(encodedUrl);
  try {
    const endpoint = type === "audio" ? "/audio" : "/video";
    const response = await axios.get(`${decodedUrl}/api/download${endpoint}`, {
      params: {
        url: url,
        quality: quality
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch {
    res.status(500).json({
      result: {
        error: "Error while fetching data."
      }
    });
  }
}