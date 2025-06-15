import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
class AlleasySeo {
  constructor() {
    this.baseUrl = "https://alleasyseo.com/get-source-code-of-webpage/output";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      cookie: "PHPSESSID=c0899672cdb626b4fba030367ae0ebca; _gid=GA1.2.121152537.1739439686; __gads=ID=532283ad9d985497:T=1739439688:RT=1739439688:S=ALNI_MYvVwXp2N4L440L1AUEoWIEqrm72Q; __gpi=UID=00001039303667a7:T=1739439688:RT=1739439688:S=ALNI_MZFMLiVW_QKonM3XSmOsmvADfCdmw; __eoi=ID=654a54cbd3e5cb0f:T=1739439688:RT=1739439688:S=AA-AfjYWtx2qtHPzWqNf2xP5nAKF; fpestid=C-ZVM7k3GDpzaXgZan9RDNdkRNjntSeNfklkARS2Sooz7QhgbGC96Awo9agFCIUnlztHqA; _cc_id=682d6ac93bb05071179e301280661ebf; panoramaId_expiry=1739526092000; _ga_W8JZSDY9WL=GS1.1.1739439686.1.1.1739439714.32.0.0; _ga=GA1.1.800221161.1739439686; FCNEC=%5B%5B%22AKsRol_TJdDPQ3oRgf6SW9_nzMcQv8xvvNqeudbDdgjphAhJT2o2RmrWjagtzuv3xsTxF2WuKgFD97xgKuPLh9KxeRVfQVT5wKsOOS3wTakae2od9Ix8IxFKkc0fxKW02bvLgw_SYvs_uFXbOqKRaH7dMtEmK8Hj1g%3D%3D%22%5D%5D",
      origin: "https://alleasyseo.com",
      priority: "u=0, i",
      referer: "https://alleasyseo.com/get-source-code-of-webpage",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getSourceCode(url) {
    try {
      const data = qs.stringify({
        url: url,
        submit: "Get Source Code"
      });
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers,
        responseType: "text"
      });
      return this.extractSourceCode(response.data);
    } catch (error) {
      return error.response?.data || error.message;
    }
  }
  extractSourceCode(html) {
    const $ = cheerio.load(html);
    return $("textarea#textArea").text() || html;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).send("URL is required");
  }
  try {
    const seo = new AlleasySeo();
    const result = await seo.getSourceCode(url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}