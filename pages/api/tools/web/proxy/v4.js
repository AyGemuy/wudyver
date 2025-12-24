import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class Proxyium {
  constructor(link) {
    this.targetLink = link;
    this.baseUrl = "https://cdn.proxyium.com/proxyrequest.php";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "max-age=0",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://proxyium.com",
      Referer: "https://proxyium.com/",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
  }
  async fetchData() {
    try {
      const {
        data
      } = await this.client.post(this.baseUrl, new URLSearchParams({
        type: "",
        proxy_country: "pl",
        url: this.targetLink
      }).toString(), {
        headers: this.headers
      });
      const $ = cheerio.load(data),
        scriptContent = $("script").eq(0).html(),
        match = scriptContent?.match(/atob\('([^']+)'\)/);
      if (!match) return null;
      let decoded = Buffer.from(match[1], "base64").toString("utf-8").match(/.{1,2}/g).map(h => String.fromCharCode(parseInt(h, 16))).join("");
      const extractedUrl = decoded.split(" ")[2]?.slice(1, -2)?.trim();
      if (!extractedUrl) return null;
      const {
        headers
      } = await this.client.get(extractedUrl), cookies = headers["set-cookie"];
      if (cookies) this.headers["Cookie"] = cookies.join("; ");
      const url = new URL(this.targetLink),
        ipUrl = new URL(extractedUrl),
        b64Domain = Buffer.from(`${url.protocol}//${url.hostname}`).toString("base64");
      const modifiedUrl = `${ipUrl.protocol}//${ipUrl.hostname}${url.pathname}${url.search ? url.search + "&" : "?"}__cpo=${b64Domain}`;
      return (await this.client.get(modifiedUrl, {
        headers: this.headers
      }).catch(e => e.response))?.data || null;
    } catch {
      return null;
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
  const proxyium = new Proxyium(url);
  try {
    const result = await proxyium.fetchData();
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}