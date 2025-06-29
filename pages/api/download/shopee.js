import axios from "axios";
import * as cheerio from "cheerio";
class Shopee {
  async download({
    url
  }) {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        },
        maxRedirects: 5,
        validateStatus: s => s >= 200 && s < 303
      });
      const finalUrl = response.request.res.responseUrl;
      let redirLink = null;
      try {
        const parsedUrl = new URL(finalUrl);
        redirLink = parsedUrl.searchParams.get("redir");
        if (redirLink) redirLink = decodeURIComponent(redirLink);
      } catch (error) {}
      if (redirLink) {
        const redirResponse = await axios.get(redirLink, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
          }
        });
        const $ = cheerio.load(redirResponse.data);
        const nextDataRaw = $('script[id="__NEXT_DATA__"][type="application/json"]').text();
        return nextDataRaw ? JSON.parse(nextDataRaw)?.props?.pageProps?.mediaInfo : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query.url : req.body.url;
  if (!params.url) {
    return res.status(400).json({
      error: "URL tidak valid."
    });
  }
  const extractor = new Shopee();
  try {
    const result = await extractor.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Handler error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}