import axios from "axios";
class Dotriz {
  constructor() {
    this.client = axios.create({
      withCredentials: true
    });
  }
  async fetchSource({
    url: targetUrl
  }) {
    const endpoint = `https://dotriz.com/tools/view-page-source/extract.php`;
    const params = new URLSearchParams({
      url: targetUrl,
      is_ajax: "true"
    });
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `https://dotriz.com/tools/view-page-source/?url=${encodeURIComponent(targetUrl)}`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    try {
      const res = await this.client.get(`${endpoint}?${params}`, {
        headers: headers
      });
      if (!res.data?.success || !res.data?.html_source) throw new Error("Tidak ada hasil ditemukan");
      return res.data.html_source.trim();
    } catch (err) {
      console.error("❌ Dotriz Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).send("URL is required");
  }
  try {
    const dotriz = new Dotriz();
    const result = await dotriz.fetchSource(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    console.error("❌ Handler Error:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}