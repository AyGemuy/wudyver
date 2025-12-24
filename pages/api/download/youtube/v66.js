import axios from "axios";
import crypto from "crypto";
const NEOXR_API = "https://s.neoxr.eu/api";
const OPEN_API = "open-api-created-by-neoxr";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const HEADERS = {
  accept: "application/json",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://s.neoxr.eu/tools/youtube/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": UA
};
class NeoDownloader {
  constructor() {
    this.log = console.log.bind(console, "[NeoDL]");
  }
  hash(str) {
    return crypto.createHash("sha256").update(str, "utf8").digest("hex");
  }
  async solvePow(challenge, target) {
    this.log("🔐 Solving PoW...");
    const decoded = atob(challenge);
    const [prefix] = decoded.split("|");
    let nonce = 0;
    const maxIter = 5e6;
    return new Promise(resolve => {
      const worker = () => {
        for (let i = 0; i < 1e3; i++) {
          nonce++;
          const hashStr = `${prefix}|${nonce}|${OPEN_API}`;
          if (this.hash(hashStr).startsWith(target)) {
            this.log(`✅ PoW solved: ${nonce}`);
            return resolve(nonce);
          }
          if (nonce >= maxIter) {
            this.log("❌ PoW failed");
            return resolve(0);
          }
        }
        setImmediate(worker);
      };
      worker();
    });
  }
  async getChallenge() {
    this.log("📥 Getting challenge...");
    const res = await axios.get(`${NEOXR_API}/challenge`, {
      headers: HEADERS
    });
    return res?.data || {};
  }
  async download({
    url,
    type = "video",
    quality = "360p"
  }) {
    try {
      this.log(`🔄 Processing: ${url}`);
      const chal = await this.getChallenge();
      const solution = await this.solvePow(chal.challenge, chal.target);
      if (!solution) throw new Error("PoW failed");
      const payload = {
        link: url,
        type: type,
        ...type === "video" && {
          quality: quality
        },
        challenge: chal.challenge,
        solution: solution
      };
      const res = await axios.post(`${NEOXR_API}/youtube-converter`, payload, {
        headers: {
          ...HEADERS,
          "content-type": "application/json",
          origin: "https://s.neoxr.eu"
        }
      });
      if (!res?.data?.status) throw new Error(res?.data?.msg || "Conversion failed");
      this.log(`✅ Ready: ${res.data.title}`);
      return res.data;
    } catch (err) {
      this.log(`❌ Failed: ${err.message}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "url are required"
    });
  }
  try {
    const downloader = new NeoDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}