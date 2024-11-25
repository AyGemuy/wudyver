import fetch from "node-fetch";

const API_KEY = "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f";
const RAPIDAPI_HOST = "ytstream-download-youtube-videos.p.rapidapi.com";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID is required" });
  }

  const url = `https://${RAPIDAPI_HOST}/dl?id=${videoId}`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
