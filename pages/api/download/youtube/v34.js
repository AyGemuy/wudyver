import CryptoJS from "crypto-js";
import fetch from "node-fetch";
class YouTubeDownloader {
  constructor() {
    this.headers = {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache"
    };
  }
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async fetchJson(url, description, options = {}) {
    try {
      console.log(`[LOG] Mengambil JSON dari: ${url} (${description})`);
      const res = await fetch(url, {
        headers: this.headers,
        ...options
      });
      if (!res.ok) {
        throw new Error(`${description} gagal: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      console.log(`[LOG] Berhasil mengambil JSON untuk: ${description}`);
      return json;
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil JSON untuk ${description}: ${error.message}`);
      throw error;
    }
  }
  async hybridfallrye(query, {
    mode = "download"
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses hybridfallrye (mode: ${mode})...`);
      if (mode === "search") {
        const cleanQuery = query.replace(/[^0-9A-Za-z _]/g, "").trim().replace(/ +/g, "-");
        console.log(`[LOG] Melakukan pencarian hybridfallrye untuk: ${cleanQuery}`);
        const json = await this.fetchJson(`https://hybridfallrye.ca/discover/${cleanQuery}/`, "Pencarian Hybridfallrye", {
          method: "POST"
        });
        if (!json.length) {
          throw new Error(`Tidak ada hasil yang ditemukan untuk: ${query}`);
        }
        console.log("[LOG] Pencarian hybridfallrye selesai.");
        return json;
      }
      const videoId = typeof query === "string" && query.includes("youtube") ? query.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]*)/)?.[1] : query;
      if (!videoId) {
        throw new Error("ID video YouTube tidak valid.");
      }
      console.log(`[LOG] ID Video hybridfallrye: ${videoId}`);
      console.log("[LOG] Mengambil info video hybridfallrye...");
      const infoJson = await this.fetchJson(`https://c01-h01.cdnframe.com/api/v4/info/${videoId}`, "Info Hybridfallrye");
      const {
        title,
        thumbnail
      } = infoJson;
      const token = infoJson?.formats?.audio?.mp3?.[0]?.token;
      if (!token) {
        throw new Error("Gagal mendapatkan token.");
      }
      console.log(`[LOG] Info video hybridfallrye berhasil diambil. Judul: ${title}`);
      console.log("[LOG] Memulai konversi hybridfallrye...");
      const convertJson = await this.fetchJson("https://c01-h01.cdnframe.com/api/v4/convert", "Konversi Hybridfallrye", {
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          token: token
        }),
        method: "POST"
      });
      const {
        jobId
      } = convertJson;
      if (!jobId) {
        throw new Error("Gagal mendapatkan ID pekerjaan.");
      }
      console.log(`[LOG] Pekerjaan konversi hybridfallrye dimulai dengan Job ID: ${jobId}`);
      let job = {};
      let attempt = 0;
      while (job.progress !== 100) {
        console.log(`[LOG] Memeriksa status pekerjaan hybridfallrye (percobaan ke-${attempt + 1})...`);
        job = await this.fetchJson(`https://c01-h01.cdnframe.com/api/v4/status/${jobId}`, "Status Hybridfallrye", {
          headers: {
            "content-type": "application/json"
          }
        });
        if (job.progress === 0) attempt++;
        if (job.progress === 100 && job.status === "active") {
          throw new Error(`Konversi gagal: ${job.state}`);
        }
        if (job.progress !== 100) {
          console.log(`[LOG] Konversi ${job.progress}% selesai, menunggu 3 detik.`);
          await this.delay(3e3);
        }
      }
      console.log("[LOG] Konversi hybridfallrye selesai.");
      return {
        videoId: videoId,
        title: title,
        thumbnail: thumbnail,
        download: job.download
      };
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam hybridfallrye: ${error.message}`);
      throw error;
    }
  }
  async y2matenu(url) {
    try {
      console.log("[LOG] Memulai proses y2matenu...");
      const result = await this.fetchJson("https://e.mnuu.nu/?_=" + Math.random(), "Y2mate.nu", {
        body: JSON.stringify({
          url: url
        }),
        method: "POST"
      });
      console.log("[LOG] y2matenu selesai.");
      return result;
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam y2matenu: ${error.message}`);
      throw error;
    }
  }
  async ytmp3cc(url) {
    try {
      console.log("[LOG] Memulai proses ytmp3cc...");
      const result = await this.fetchJson("https://e.ecoe.cc/?_=" + Math.random(), "Ytmp3.cc", {
        body: JSON.stringify({
          url: url
        }),
        method: "POST"
      });
      console.log("[LOG] ytmp3cc selesai.");
      return result;
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam ytmp3cc: ${error.message}`);
      throw error;
    }
  }
  async ytmp4blog(query, {
    mode = "download"
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses ytmp4blog (mode: ${mode})...`);
      const headers = {
        origin: "https://ytmp4.blog",
        referer: "https://ytmp4.blog"
      };
      if (mode === "search") {
        if (typeof query !== "string" || query.length === 0) {
          throw new Error("Kueri pencarian tidak valid.");
        }
        console.log(`[LOG] Melakukan pencarian ytmp4blog untuk: ${encodeURIComponent(query)}`);
        const result = await this.fetchJson("https://us-central1-ytmp3-tube.cloudfunctions.net/searchResult?q=" + encodeURIComponent(query), "Pencarian Ytmp4.blog", {
          headers: headers
        });
        console.log("[LOG] Pencarian ytmp4blog selesai.");
        return result;
      }
      const api = "https://api.ytmp3.tube/mp3/1?url=" + query;
      console.log(`[LOG] Mengambil data video ytmp4blog dari: ${api}`);
      const response = await fetch(api, {
        headers: headers
      });
      if (!response.ok) {
        throw new Error(`Pengunduhan gagal: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const match = html.match(/{\\"videoId\\":(.+?)}/)?.[0];
      if (!match) {
        throw new Error("Gagal mengekstrak data video.");
      }
      const cleaned = match.replaceAll(/\\/g, "");
      const json = JSON.parse(cleaned);
      console.log("[LOG] Data video ytmp4blog berhasil diekstrak.");
      let result = {};
      const body = JSON.stringify({
        id: json.videoId,
        audioBitrate: "128",
        token: json.token,
        timestamp: json.timestamp,
        secretToken: json.encryptedVideoId
      });
      const downloadHeaders = {
        origin: "https://api.ytmp3.tube",
        referer: api
      };
      do {
        console.log("[LOG] Memulai permintaan unduhan ytmp4blog...");
        const downloadResponse = await fetch("https://api.ytmp3.tube/api/download/mp3", {
          headers: downloadHeaders,
          body: body,
          method: "POST"
        });
        if (!downloadResponse.ok) {
          throw new Error(`Pengunduhan gagal: ${downloadResponse.status}`);
        }
        result = await downloadResponse.json();
        if (result.status === "fail") {
          throw new Error(`Kesalahan server: ${result.msg}`);
        }
        if (result.status === "processing") {
          console.log("[LOG] ytmp4blog masih dalam proses, menunggu 5 detik.");
          await this.delay(5e3);
        }
      } while (result.status === "processing");
      console.log("[LOG] ytmp4blog selesai.");
      return result;
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam ytmp4blog: ${error.message}`);
      throw error;
    }
  }
  async mp3dl(url, {
    format = "mp3",
    quality = 128
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses mp3dl (format: ${format}, kualitas: ${quality})...`);
      const generateToken = () => {
        const payload = JSON.stringify({
          timestamp: Date.now()
        });
        const key = "dyhQjAtqAyTIf3PdsKcJ6nMX1suz8ksZ";
        return CryptoJS.AES.encrypt(payload, key).toString();
      };
      const headers = {
        "content-type": "application/json"
      };
      const endpoint = format === "mp4" ? "downloadMP4" : "convert";
      const baseUrl = format === "mp4" ? "https://m1.ezsrv.net/api/" : "https://ds1.ezsrv.net/api/";
      const body = JSON.stringify({
        url: url,
        quality: format === "mp4" ? 360 : quality,
        trim: false,
        startT: 0,
        endT: 0,
        token: generateToken()
      });
      const result = await this.fetchJson(baseUrl + endpoint, "MP3DL/EZMP4", {
        headers: headers,
        body: body,
        method: "POST"
      });
      console.log("[LOG] mp3dl selesai.");
      return result;
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam mp3dl: ${error.message}`);
      throw error;
    }
  }
  async ezmp4(url, {
    quality = 360
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses ezmp4 (kualitas: ${quality})...`);
      const result = await this.mp3dl(url, {
        format: "mp4",
        quality: quality
      });
      console.log("[LOG] ezmp4 selesai.");
      return result;
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam ezmp4: ${error.message}`);
      throw error;
    }
  }
  async ytmp3ing(url, {
    format = "mp3"
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses ytmp3ing (format: ${format})...`);
      const regYoutubeId = /https:\/\/(?:www\.youtube\.com\/watch\?v=|m\.youtube\.com\/|youtu\.be\/|www\.youtube\.com\/shorts\/|youtube\.com\/watch\?v=)([^&|^?]+)/;
      const videoId = url.match(regYoutubeId)?.[1];
      if (!videoId) {
        throw new Error("URL YouTube tidak valid.");
      }
      console.log(`[LOG] ID Video ytmp3ing: ${videoId}`);
      const availableFormat = ["mp3", "mp4"];
      const formatIndex = availableFormat.findIndex(v => v === format.toLowerCase());
      if (formatIndex === -1) {
        throw new Error(`Format tidak valid: ${format}`);
      }
      const chosenUrlPath = ["/audio", "/video"][formatIndex];
      const getCookieAndToken = async () => {
        try {
          console.log("[LOG] Mendapatkan cookie dan token CSRF untuk ytmp3ing...");
          const res = await fetch("https://ytmp3.ing/");
          if (!res.ok) {
            throw new Error(`Gagal mendapatkan cookie: ${res.status}`);
          }
          const cookie = res.headers.getSetCookie();
          const html = await res.text();
          const csrfmiddlewaretoken = html.match(/value="([^"]+)"/)?.[1];
          if (!csrfmiddlewaretoken) {
            throw new Error("Gagal mendapatkan token CSRF.");
          }
          console.log("[LOG] Cookie dan token CSRF ytmp3ing berhasil didapatkan.");
          return {
            cookie: cookie,
            csrfmiddlewaretoken: csrfmiddlewaretoken
          };
        } catch (error) {
          console.error(`[ERROR] Gagal mendapatkan cookie/token untuk ytmp3ing: ${error.message}`);
          throw error;
        }
      };
      const {
        cookie,
        csrfmiddlewaretoken
      } = await getCookieAndToken();
      console.log("[LOG] Mengirim permintaan unduhan ytmp3ing...");
      const response = await fetch("https://ytmp3.ing" + chosenUrlPath, {
        headers: {
          "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryeByWolep",
          "x-csrftoken": csrfmiddlewaretoken,
          cookie: cookie
        },
        body: '------WebKitFormBoundaryeByWolep\r\nContent-Disposition: form-data; name="url"\r\n\r\n' + url + "\r\n------WebKitFormBoundaryeByWolep--\r\n",
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(`Pengunduhan gagal: ${response.status}`);
      }
      let {
        url: downloadUrl,
        filename
      } = await response.json();
      downloadUrl = atob(downloadUrl);
      console.log("[LOG] ytmp3ing selesai.");
      return {
        filename: filename,
        url: downloadUrl
      };
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam ytmp3ing: ${error.message}`);
      throw error;
    }
  }
  async ytmp3mobi(url, {
    format = "mp3"
  } = {}) {
    try {
      console.log(`[LOG] Memulai proses ytmp3mobi (format: ${format})...`);
      const regYoutubeId = /https:\/\/(?:www\.youtube\.com\/watch\?v=|m\.youtube\.com\/|youtu\.be\/|www\.youtube\.com\/shorts\/|youtube\.com\/watch\?v=)([^&|^?]+)/;
      const videoId = url.match(regYoutubeId)?.[1];
      if (!videoId) {
        throw new Error("URL YouTube tidak valid.");
      }
      console.log(`[LOG] ID Video ytmp3mobi: ${videoId}`);
      const availableFormat = ["mp3", "mp4"];
      if (!availableFormat.includes(format.toLowerCase())) {
        throw new Error(`Format tidak valid: ${format}`);
      }
      const urlParam = {
        v: videoId,
        f: format,
        _: Math.random()
      };
      const headers = {
        Referer: "https://id.ytmp3.mobi/"
      };
      const fetchMobiJson = async (fetchUrl, description) => {
        try {
          console.log(`[LOG] Mengambil JSON ytmp3mobi dari: ${fetchUrl} (${description})`);
          const res = await fetch(fetchUrl, {
            headers: headers
          });
          if (!res.ok) {
            throw new Error(`${description} gagal: ${res.status}`);
          }
          const json = await res.json();
          console.log(`[LOG] Berhasil mengambil JSON ytmp3mobi untuk: ${description}`);
          return json;
        } catch (error) {
          console.error(`[ERROR] Gagal mengambil JSON ytmp3mobi untuk ${description}: ${error.message}`);
          throw error;
        }
      };
      console.log("[LOG] Mendapatkan URL konversi ytmp3mobi...");
      const {
        convertURL
      } = await fetchMobiJson("https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=" + Math.random(), "Mendapatkan URL konversi");
      console.log("[LOG] Mendapatkan URL kemajuan ytmp3mobi...");
      const {
        progressURL,
        downloadURL
      } = await fetchMobiJson(`${convertURL}&${new URLSearchParams(urlParam).toString()}`, "Mendapatkan URL kemajuan");
      let {
        error,
        progress,
        title
      } = {};
      while (progress !== 3) {
        console.log(`[LOG] Memeriksa kemajuan ytmp3mobi (saat ini: ${progress})...`);
        ({
          error,
          progress,
          title
        } = await fetchMobiJson(progressURL, "Memeriksa kemajuan"));
        if (error) {
          throw new Error(`Kesalahan kemajuan: ${error}`);
        }
      }
      console.log("[LOG] ytmp3mobi selesai.");
      return {
        title: title,
        downloadURL: downloadURL
      };
    } catch (error) {
      console.error(`[ERROR] Kesalahan dalam ytmp3mobi: ${error.message}`);
      throw error;
    }
  }
  async download({
    action = "download",
    url,
    query,
    ...rest
  }) {
    const results = {};
    const services = {
      hybridfallrye: this.hybridfallrye,
      y2matenu: this.y2matenu,
      ytmp3cc: this.ytmp3cc,
      ytmp4blog: this.ytmp4blog,
      mp3dl: this.mp3dl,
      ezmp4: this.ezmp4,
      ytmp3ing: this.ytmp3ing,
      ytmp3mobi: this.ytmp3mobi
    };
    const downloadHosts = ["y2matenu", "ytmp3cc", "ytmp4blog", "mp3dl", "ezmp4", "ytmp3ing", "ytmp3mobi"];
    const searchHosts = ["hybridfallrye", "ytmp4blog"];
    let hostsToUse;
    let targetValue;
    if (action === "download") {
      hostsToUse = downloadHosts;
      targetValue = url;
      if (!targetValue) {
        throw new Error("Paramenter url harus disediakan untuk aksi download.");
      }
    } else if (action === "search") {
      hostsToUse = searchHosts;
      targetValue = query;
      if (!targetValue) {
        throw new Error("Paramenter query harus disediakan untuk aksi search.");
      }
    } else {
      throw new Error('Aksi tidak valid. Gunakan "download" atau "search".');
    }
    console.log(`\n--- Memulai aksi "${action}" dengan target: ${targetValue.substring(0, 50)}... ---`);
    for (const host of hostsToUse) {
      console.log(`[LOG] Mencoba host: ${host}...`);
      try {
        const serviceFunction = services[host].bind(this);
        let result;
        if (action === "download") {
          if (host === "ytmp3ing" || host === "ytmp3mobi") {
            result = await serviceFunction(targetValue, {
              format: rest.format
            });
          } else if (host === "ezmp4") {
            result = await serviceFunction(targetValue, {
              quality: rest.quality
            });
          } else if (host === "mp3dl") {
            result = await serviceFunction(targetValue, {
              format: rest.format,
              quality: rest.quality
            });
          } else if (host === "hybridfallrye" || host === "ytmp4blog") {
            result = await serviceFunction(targetValue, {
              mode: "download",
              ...rest
            });
          } else {
            result = await serviceFunction(targetValue);
          }
        } else {
          result = await serviceFunction(targetValue, {
            mode: "search",
            ...rest
          });
        }
        results[host] = result;
        console.log(`[LOG] Host "${host}" berhasil.`);
      } catch (error) {
        console.error(`[ERROR] Host "${host}" gagal: ${error.message}`);
      }
    }
    console.log(`\n--- Aksi "${action}" selesai. ${Object.keys(results).length} host berhasil. ---`);
    return results;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YouTubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}