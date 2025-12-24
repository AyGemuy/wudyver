import axios from "axios";
class AxiosDownloader {
  constructor() {
    this.url = {
      origin: "https://ytmp3.cx"
    };
    this.baseHeaders = {
      "accept-encoding": "gzip, deflate, br, zstd"
    };
  }
  _log(message) {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  }
  _extractVideoId(fV) {
    this._log("Mengekstrak ID video...");
    let v;
    if (fV.includes("youtu.be")) {
      v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV);
    } else if (fV.includes("youtube.com")) {
      v = fV.includes("/shorts/") ? /\/([a-zA-Z0-9\-\_]{11})/.exec(fV) : /v\=([a-zA-Z0-9\-\_]{11})/.exec(fV);
    }
    const result = v?.[1];
    if (!result) throw new Error("Gagal mengekstrak ID video");
    this._log(`ID Video berhasil diekstrak: ${result}`);
    return result;
  }
  async _getInitUrl() {
    this._log("Mengambil URL inisialisasi...");
    try {
      const r1 = await axios.get(this.url.origin, {
        headers: this.baseHeaders
      });
      this._log("Berhasil mengakses beranda");
      const html = r1.data;
      const jsPath = html.match(/<script src="(.+?)"/)?.[1];
      const jsUrl = this.url.origin + (jsPath || "");
      const r2 = await axios.get(jsUrl, {
        headers: this.baseHeaders
      });
      this._log("Berhasil mengambil data JavaScript");
      const js = r2.data;
      const gB_m = js.match(/gB=(.+?),gD/)?.[1];
      const gB = eval(gB_m);
      const html_m = html.match(/<script>(.+?)<\/script>/)?.[1];
      const hiddenGc = eval(html_m + "gC");
      const gC = Object.fromEntries(Object.getOwnPropertyNames(hiddenGc).map(key => [key, hiddenGc[key]]));
      const decodeBin = d => d.split(" ").map(v => parseInt(v, 2));
      const decodeHex = d => d.match(/0x[a-fA-F0-9]{2}/g).map(v => String.fromCharCode(v)).join("");
      const getTimestamp = () => Math.floor(new Date().getTime() / 1e3);

      function authorization() {
        var dec = decodeBin(gC.d(1)[0]);
        var k = "";
        for (var i = 0; i < dec.length; i++) k += gC.d(2)[0] > 0 ? atob(gC.d(1)[1]).split("").reverse().join("")[dec[i] - gC.d(2)[1]] : atob(gC.d(1)[1])[dec[i] - gC.d(2)[1]];
        if (gC.d(2)[2] > 0) k = k.substring(0, gC.d(2)[2]);
        switch (gC.d(2)[3]) {
          case 0:
            return btoa(k + "_" + decodeHex(gC.d(3)[0]));
          case 1:
            return btoa(k.toLowerCase() + "_" + decodeHex(gC.d(3)[0]));
          case 2:
            return btoa(k.toUpperCase() + "_" + decodeHex(gC.d(3)[0]));
        }
      }
      const api_m = Array.from(js.matchAll(/};var \S{1}=(.+?);gR&&\(/g));
      const e = api_m?.[1]?.[1];
      const apiUrl = eval(`${e}`);
      this._log(`URL API berhasil didapatkan: ${apiUrl}`);
      return apiUrl;
    } catch (e) {
      console.error("Fungsi getInitUrl gagal:", e.message);
      throw new Error("Fungsi getInitUrl gagal");
    }
  }
  async download({
    url,
    f = "mp3",
    ...rest
  }) {
    this._log(`Memulai proses unduh untuk URL: ${url} dengan format: ${f}`);
    try {
      if (!/^mp3|mp4$/.test(f)) throw new Error("Format yang valid adalah mp3 atau mp4");
      const v = this._extractVideoId(url);
      const headers = {
        referer: this.url.origin,
        ...this.baseHeaders,
        ...rest
      };
      const initApi = await this._getInitUrl();
      const r1 = await axios.get(initApi, {
        headers: headers
      });
      this._log("Berhasil melakukan permintaan inisialisasi");
      const j1 = r1.data;
      const {
        convertURL
      } = j1;
      const convertApi = `${convertURL}&v=${v}&f=${f}&_=${Math.random()}`;
      const r2 = await axios.get(convertApi, {
        headers: headers
      });
      this._log("Berhasil melakukan permintaan konversi URL");
      const j2 = r2.data;
      if (j2.error) throw new Error(`Terjadi kesalahan pada nilai konversi.\n${JSON.stringify(j2, null, 2)}`);
      if (j2.redirectURL) {
        const r3 = await axios.get(j2.redirectURL, {
          headers: headers
        });
        this._log("Berhasil dialihkan");
        const j3 = r3.data;
        const result = {
          title: j3.title,
          downloadURL: j3.downloadURL,
          format: f
        };
        this._log(`Proses unduh selesai untuk: ${result.title}`);
        return result;
      } else {
        let j3b;
        do {
          const r3b = await axios.get(j2.progressURL, {
            headers: headers
          });
          this._log("Memeriksa kemajuan...");
          j3b = r3b.data;
          if (j3b.error) throw new Error(`Terjadi kesalahan saat memeriksa kemajuan.\n${JSON.stringify(j3b, null, 2)}`);
          if (j3b.progress == 3) {
            const result = {
              title: j3b.title,
              downloadURL: j2.downloadURL,
              format: f
            };
            this._log(`Proses unduh selesai untuk: ${result.title}`);
            return result;
          }
          await new Promise(resolve => setTimeout(resolve, 3e3));
        } while ((j3b?.progress ?? 0) != 3);
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat mengunduh:", error.message);
      throw error;
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
    const downloader = new AxiosDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}