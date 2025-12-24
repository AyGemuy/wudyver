import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      lon,
      lat,
      token,
      style
    } = req.method === "GET" ? req.query : req.body;
    if (!lon || !lat) {
      return res.status(400).json({
        error: "Missing required parameters"
      });
    }
    const tokens = ["pk.eyJ1IjoiY3liZXIyMSIsImEiOiJjbDBtbm40MWoxMzNmM2JxdGNjZmtvOHRzIn0.OLPda8qpTVVm7sbqFvxbIQ", "pk.eyJ1IjoidGhvbWFzcHJ1ZGVsNjQ5NCIsImEiOiJjbDA2dWpzYjMwMWlxM2tzN2c0Y2JoMGtnIn0.5tX0c-HsGG9qWniFxXIZEg", "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", "pk.eyJ1IjoiYXl1c2hqb3NoaTEzODAiLCJhIjoiY2xhajN2bjV0MDhuYTNzbGZ4eXY3aWV0YyJ9.-t8ccvCJhwwHcOdi435HrQ"];
    const selectedToken = token || tokens[Math.floor(Math.random() * tokens.length)];
    const styles = {
      A: `https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/pin-l-embassy+f74e4e(${lon},${lat})/${lon},${lat},16/500x300?access_token=${selectedToken}`,
      B: `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s-l+000(${lon},${lat})/${lon},${lat},14/500x300?access_token=${selectedToken}`,
      C: `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/url-https%3A%2F%2Fdocs.mapbox.com%2Fapi%2Fimg%2Fcustom-marker.png(${lon},${lat})/${lon},${lat},15/500x300?access_token=${selectedToken}`,
      D: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${lon},${lat},0,60/400x400?access_token=${selectedToken}`,
      E: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/geojson({"type":"FeatureCollection","features":[{"type":"Feature","properties":{"marker-color":"#462eff","marker-size":"medium","marker-symbol":"bus"},"geometry":{"type":"Point","coordinates":[${lon},${lat}]}}]})/${lon},${lat},13/500x300?access_token=${selectedToken}`,
      F: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/geojson({"type":"Point","coordinates":[${lon},${lat}]})/${lon},${lat},12/500x300?access_token=${selectedToken}`,
      G: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-a+9ed4bd(${lon},${lat}),pin-s-b+000(${lon},${lat}),path-5+f44-0.5(%7DrpeFxbnjVsFwdAvr@cHgFor@jEmAlFmEMwM_FuItCkOi@wc@bg@wBSgM)/auto/500x300?access_token=${selectedToken}`
    };
    const selectedStyle = styles[style.toUpperCase()] || styles.A;
    try {
      const response = await fetch(selectedStyle);
      if (!response.ok) {
        return res.status(500).json({
          error: "Error fetching map image"
        });
      }
      const imageBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "image/png");
      res.send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}