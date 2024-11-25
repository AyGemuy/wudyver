import fetch from "node-fetch";

export default async function handler(req, res) {
  const { query = "", offset = 0 } = req.query;
  
  if (!query) return res.status(400).json({ success: false, message: "Missing query parameter" });

  try {
    const url = "https://fontic.xyz/search";
    const body = JSON.stringify({ query, offset: parseInt(offset) || 0 });
    const headers = {
      "Content-Type": "application/json",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer:
        "https://fontic.xyz/?ref=taaft&utm_source=taaft&utm_medium=referral",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      compress: true,
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const result = await response.json();
    const fonts = result.results.map((item) => ({
      ...item,
      fontUrl: `https://fontic.xyz/static/${item.font.toLowerCase().replace(/\s+/g, "")}.ttf`,
    }));

    return res.status(200).json({ success: true, fonts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
