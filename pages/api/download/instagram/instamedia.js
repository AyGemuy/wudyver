import fetch from "node-fetch";

const API_KEY = "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f";
const RAPIDAPI_HOST = "instagram-media-downloader.p.rapidapi.com";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, urlInstagram } = req.query;

  if (!type || !urlInstagram) {
    return res.status(400).json({ error: "Both type and Instagram URL are required" });
  }

  const url = `https://${RAPIDAPI_HOST}/rapid/${type}.php?url=${encodeURIComponent(urlInstagram)}`;
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
