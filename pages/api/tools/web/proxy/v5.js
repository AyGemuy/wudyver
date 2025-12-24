import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SteganosProxy {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://www.steganos.com",
        Referer: "https://www.steganos.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
  }
  async updateProxy(url) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await this.client.post("https://proxy-us.steganos.com/includes/process.php?action=update", `u=${encodedUrl}&wp_location=https%3A%2F%2Fproxy-us.steganos.com%2Fincludes%2Fprocess.php%3Faction%3Dupdate`);
      return response.data;
    } catch (error) {
      console.error("Error updating proxy:", error);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const proxy = new SteganosProxy();
  try {
    const result = await proxy.updateProxy(url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}