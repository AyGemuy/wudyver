import axios from "axios";
import {
  createHash
} from "crypto";
class OmarScraper {
  constructor() {
    this.base = "https://for.omar-thing.site";
    this.apiTwo = "https://nodejs-serverless-function-express-ivory-ten.vercel.app";
    this.salt = "N1o4YT1Eg8mJZCZVu4oB0uSqSnLFKEz7";
    this.heads = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://omar-thing.site",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://omar-thing.site/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  l(msg) {
    console.log(`[OmarScraper] ${msg}`);
  }
  c(d) {
    return createHash("sha256").update(d).digest("hex");
  }
  tk(u, t) {
    const str = `${u}${t}${this.salt}`;
    return this.c(str);
  }
  async search({
    username,
    following = true,
    ...rest
  }) {
    this.l(`Memulai pencarian untuk: ${username}`);
    const ts = Math.floor(Date.now() / 1e3);
    const target = username || "wudysoft";
    const token = this.tk(target, ts);
    try {
      this.l("Mengambil data profil...");
      const pRes = await axios.post(`${this.base}/test`, {
        username: target,
        ts: ts,
        ...rest
      }, {
        headers: {
          ...this.heads,
          "x-app-token": token,
          "x-app-ts": ts.toString()
        }
      });
      const pData = pRes?.data;
      if (!pData) throw new Error("Tidak ada data profil yang diterima");
      const {
        secUid = "",
          userId = "",
          nickname = "N/A",
          stats = {}
      } = pData;
      this.l(`Profil ditemukan: ${nickname} (UID: ${userId})`);
      const result = {
        profile: pData,
        followingList: []
      };
      if (following && secUid && userId) {
        this.l("Mengambil daftar following...");
        const fHeads = {
          ...this.heads,
          origin: "https://omar-thing.site",
          referer: "https://omar-thing.site/",
          "sec-fetch-site": "cross-site"
        };
        const fRes = await axios.post(`${this.apiTwo}/api/following`, {
          secUid: secUid,
          userId: userId,
          cursor: "0"
        }, {
          headers: fHeads
        });
        const fList = fRes?.data?.userList || [];
        result.followingList = fList;
        this.l(`Berhasil mengambil ${fList.length} akun following.`);
      }
      return result;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unknown Error";
      this.l(`Error terjadi: ${msg}`);
      return {
        error: true,
        message: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.username) {
    return res.status(400).json({
      error: "Parameter 'username' diperlukan"
    });
  }
  const api = new OmarScraper();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}