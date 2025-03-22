import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    id,
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!id || !text) {
    return res.status(400).json({
      error: "Both id and text are required"
    });
  }
  try {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    const body = [`LogoID=${id}`, `Text=${encodeURIComponent(text)}`, "FontSize=70", "FileFormat=6", "Integer5=0", "Integer7=0", "Integer8=0", "Integer6=0", "Integer9=0", "Integer13=on", "Integer12=on"].join("&");
    const response = await fetch("https://cooltext.com/PostChange", {
      method: "POST",
      headers: headers,
      body: body
    });
    const data = await response.json();
    const _response = await fetch(data.RenderedImageUrl);
    if (!_response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const arrayBuffer = await _response.arrayBuffer();
    console.log("Query processing complete!");
    res.setHeader("Content-Type", "image/png");
    return res.status(200).end(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}