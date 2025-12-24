import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    lat,
    lon
  } = req.method === "GET" ? req.query : req.body;
  if (!(lat || lon)) {
    return res.status(400).json({
      error: "lat/lon is required"
    });
  }
  const url = `https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}`;
  const options = {
    method: "GET"
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}