import fetch from "node-fetch";
const API_KEY = "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f";
const RAPIDAPI_HOST = "all-media-downloader.p.rapidapi.com";
export default async function handler(req, res) {
  const {
    url: urlMedia
  } = req.method === "GET" ? req.query : req.body;
  if (!urlMedia) {
    return res.status(400).json({
      error: "Media URL is required"
    });
  }
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST
    },
    body: JSON.stringify({
      url: urlMedia
    })
  };
  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/download`, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    Promise.resolve(data).then(() => {
      console.log("Query processing complete!");
    }).catch(error => {
      console.error("Error processing query:", error);
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}