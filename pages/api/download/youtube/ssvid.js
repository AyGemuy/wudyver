import fetch from "node-fetch";
class YouTubeDownloader {
  constructor() {
    this.baseUrl = "https://ssvid.net";
    console.log("YouTubeDownloader diinisialisasi.");
  }
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  _getBaseHeaders() {
    return {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/youtube-to-mp3`,
      accept: "application/json, text/javascript, */*; q=0.01",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    };
  }
  _validateFormat(userFormat) {
    console.log(`Memvalidasi format: ${userFormat}`);
    const validFormats = ["mp3", "360p", "720p", "1080p"];
    if (!validFormats.includes(userFormat)) {
      throw new Error(`Format tidak valid! Format yang tersedia: ${validFormats.join(", ")}`);
    }
    console.log("Format valid.");
  }
  _handleFormat(userFormat, searchJson) {
    try {
      console.log("Menentukan format unduhan...");
      this._validateFormat(userFormat);
      let resultKey;
      if (userFormat === "mp3") {
        resultKey = searchJson?.links?.mp3?.mp3128?.k;
        if (!resultKey) throw new Error("Kunci untuk format MP3 128kbps tidak ditemukan.");
        console.log("Format MP3 dipilih.");
      } else {
        const allFormats = Object.values(searchJson?.links?.mp4 || {});
        const availableQualities = allFormats.map(v => v.q).filter(q => /\d+p/.test(q)).sort((a, b) => parseInt(b) - parseInt(a));
        let selectedQuality = userFormat;
        if (!availableQualities.includes(userFormat)) {
          selectedQuality = availableQualities[0];
          if (!selectedQuality) throw new Error("Tidak ada format video MP4 yang tersedia.");
          console.warn(`Format ${userFormat} tidak tersedia. Beralih ke kualitas terbaik yang ada: ${selectedQuality}`);
        }
        const foundFormat = allFormats.find(v => v.q === selectedQuality);
        resultKey = foundFormat?.k;
        if (!resultKey) throw new Error(`Kunci untuk format ${selectedQuality} tidak ditemukan.`);
        console.log(`Format video ${selectedQuality} dipilih.`);
      }
      return resultKey;
    } catch (error) {
      console.error("Gagal saat memproses format:", error.message);
      throw error;
    }
  }
  async _hitApi(path, payload) {
    const url = `${this.baseUrl}${path}`;
    const body = new URLSearchParams(payload).toString();
    const options = {
      method: "POST",
      headers: this._getBaseHeaders(),
      body: body
    };
    try {
      console.log(`Mengirim permintaan POST ke: ${url}`);
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Respons jaringan tidak OK: ${response.status} ${response.statusText}\nDetail: ${errorText}`);
      }
      const jsonResponse = await response.json();
      console.log(`Berhasil mendapatkan respons dari: ${path}`);
      return jsonResponse;
    } catch (error) {
      console.error(`Terjadi kesalahan saat menghubungi API di path: ${path}`, error.message);
      throw new Error(`Gagal saat menghubungi API: ${error.message}`);
    }
  }
  async _pollForLink(taskId, videoId) {
    console.log(`Server sedang mengonversi video. Memulai polling untuk Task ID: ${taskId}`);
    const maxAttempts = 20;
    const pollInterval = 5e3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling percobaan ke-${attempt}/${maxAttempts}...`);
      await this._sleep(pollInterval);
      try {
        const progressResult = await this._hitApi("/api/ajax/convert-progress", {
          b_id: taskId,
          vid: videoId
        });
        if (progressResult.c_status === "CONVERTED") {
          console.log("Konversi selesai. Link unduhan ditemukan.");
          return progressResult;
        } else if (progressResult.c_status === "FAILED") {
          throw new Error(`Konversi di server gagal: ${progressResult.mess || "Tidak ada detail"}`);
        }
      } catch (error) {
        throw new Error(`Polling gagal: ${error.message}`);
      }
    }
    throw new Error("Gagal mendapatkan link unduhan setelah beberapa kali mencoba (timeout).");
  }
  async download({
    query,
    type = "mp3"
  }) {
    if (!query) {
      const err = new Error("Paramenter 'query' (berisi query pencarian atau URL YouTube) wajib diisi.");
      console.error(`[ERROR] ${err.message}`);
      throw err;
    }
    try {
      console.log(`Memulai proses unduhan untuk "${query}" dengan format "${type}"`);
      let searchResult = await this._hitApi("/api/ajax/search", {
        query: query,
        cf_token: "",
        vt: "youtube"
      });
      if (searchResult.p === "search") {
        console.log(`"${query}" terdeteksi sebagai query pencarian.`);
        if (!searchResult?.items?.length) throw new Error(`Tidak ada hasil pencarian untuk "${query}".`);
        const firstResult = searchResult.items[0];
        const videoUrl = `https://www.youtube.com/watch?v=${firstResult.v}`;
        console.log(`[Video ditemukan] Judul: ${firstResult.t}\nURL: ${videoUrl}`);
        searchResult = await this._hitApi("/api/ajax/search", {
          query: videoUrl,
          cf_token: "",
          vt: "youtube"
        });
      }
      const videoId = searchResult.vid;
      if (!videoId) throw new Error("Video ID tidak ditemukan dari hasil pencarian.");
      const conversionKey = this._handleFormat(type, searchResult);
      console.log("Meminta konversi dari server...");
      let conversionResult = await this._hitApi("/api/ajax/convert", {
        k: conversionKey,
        vid: videoId
      });
      if (conversionResult.c_status === "CONVERTING") {
        const taskId = conversionResult.b_id;
        if (!taskId) throw new Error("Server memulai konversi tetapi tidak memberikan Task ID.");
        conversionResult = await this._pollForLink(taskId, videoId);
      }
      console.log("Proses unduhan selesai.");
      return conversionResult;
    } catch (error) {
      console.error(`[ERROR] Terjadi kegagalan dalam proses unduhan: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const downloader = new YouTubeDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}