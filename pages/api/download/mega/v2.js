import axios from "axios";
import CryptoJS from "crypto-js";
class MegaDownload {
  constructor() {
    this.base = "https://g.api.mega.co.nz/cs";
    this.headers = {
      "user-agent": "Postify/1.0.0",
      origin: "https://mega.nz",
      referer: "https://mega.nz"
    };
  }
  async download(inputUrl, retryCount = 0, timeout = 1e4) {
    const url = decodeURIComponent(inputUrl);
    let result = {
      result: []
    };
    try {
      const [, fileId] = url.match(/file\/([^#]+)/) || [];
      const fileKey = url.split("#")[1];
      if (!fileId) {
        return {
          error: "Apalaaaahh 🗿 cuman link meganya doang! f*ck lahh"
        };
      }
      if (!fileKey || fileKey.length !== 43) {
        return {
          error: fileKey.length < 43 ? "Karakter link mega nya kurang bree, coba cek lagi dah 😂" : "Karakter link mega nya kelebihan bree, coba cek lagi dah 😂"
        };
      }
      const {
        data
      } = await axios.post(this.base, [{
        a: "g",
        g: 1,
        p: fileId
      }], {
        headers: this.headers,
        timeout: timeout
      });
      const base64ToAb = base64 => {
        if (typeof base64 !== "string") {
          return {
            error: base64
          };
        }
        try {
          return {
            data: Uint8Array.from(atob(base64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))
          };
        } catch (error) {
          return {
            error: error
          };
        }
      };
      const getKey = key => {
        const k = new Uint32Array(base64ToAb(key).data.buffer);
        return new Uint8Array(new Uint32Array([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]]).buffer);
      };
      const decryptAttr = (enc, key) => {
        if (!enc || !key) {
          return {
            error: "Key ama Enc kodenya kagak ada wehhh, nyoba lagi aja nanti yak 🗿"
          };
        }
        try {
          const decrypted = CryptoJS.AES.decrypt({
            ciphertext: CryptoJS.lib.WordArray.create(base64ToAb(enc).data)
          }, CryptoJS.lib.WordArray.create(getKey(key)), {
            iv: CryptoJS.lib.WordArray.create(new Uint8Array(16)),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.NoPadding
          });
          let result = CryptoJS.enc.Utf8.stringify(decrypted).replace(/[\u0000-\u001F\u007F-\x9F]/g, "").trim();
          return {
            data: JSON.parse(result.startsWith("MEGA") ? result.substring(4) : result)
          };
        } catch (err) {
          return {
            error: err
          };
        }
      };
      const attrs = data[0].at ? decryptAttr(data[0].at, fileKey) : null;
      result.result.push({
        type: "file",
        id: fileId,
        key: fileKey,
        name: attrs && attrs.data.n || "[Encrypted Filename]",
        title: data[0].at,
        size: data[0].s,
        link: data[0].g
      });
    } catch (err) {
      if (retryCount < 3) {
        return this.download(url, retryCount + 1, timeout);
      }
      return {
        error: err.message
      };
    }
    return result;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak ditemukan. Pastikan URL sudah benar."
    });
  }
  try {
    const megaDownload = new MegaDownload();
    const result = await megaDownload.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan pada server, coba lagi nanti.",
      details: error.message
    });
  }
}