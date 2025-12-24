import axios from "axios";
class StellarDownloader {
  constructor() {
    this.cosmic_address = "https://api.downloadbazar.com";
    console.log("%c[StellarDownloader] Sistem unduhan aktif...", "color: #4299e1; font-weight: bold;");
  }
  _validateInt(val, def, field) {
    const parsedValue = parseInt(val, 10);
    const result = val === undefined || val === null ? def : isNaN(parsedValue) || parsedValue <= 0 ? (console.warn(`%c[Peringatan] Galat pada ${field}: ${val}. Menggunakan nilai default: ${def}`, "color: #f56565;"), def) : parsedValue;
    console.log(`%c[Validasi] Integer ${field}: ${val} -> ${result}`, "color: #38a169;");
    return result;
  }
  _validateLink(url) {
    if (!url || typeof url !== "string") {
      const error = "Protokol transmisi tidak valid: URL harus berupa string.";
      console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(error);
    }
    try {
      new URL(url);
      console.log(`%c[Validasi] URL: ${url} -> Valid`, "color: #38a169;");
    } catch (e) {
      const error = `Sintaksis tautan tidak dikenal: ${url}`;
      console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(error);
    }
  }
  _validateId(id, fieldName) {
    if (id === undefined || id === null) return null;
    if (typeof id !== "string" && typeof id !== "number") {
      const error = `${fieldName} harus berupa string atau numerik.`;
      console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(error);
    }
    const result = String(id);
    console.log(`%c[Validasi] ID ${fieldName}: ${id} -> ${result}`, "color: #38a169;");
    return result;
  }
  _validateLogic(value, fieldName, defaultValue = false) {
    const result = value === undefined || value === null ? defaultValue : typeof value === "boolean" ? value : value === "true" ? true : value === "false" ? false : (console.warn(`%c[Peringatan] Anomali logika pada ${fieldName}: ${value}. Menggunakan konfigurasi default: ${defaultValue}`, "color: #f56565;"), defaultValue);
    console.log(`%c[Validasi] Logika ${fieldName}: ${value} -> ${result}`, "color: #38a169;");
    return result;
  }
  formatSize(n) {
    const result = n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(2)} KB` : n < 1024 * 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(2)} MB` : `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    console.log(`%c[Format] Ukuran data: ${n} -> ${result}`, "color: #38a169;");
    return result;
  }
  convertToSeconds(timeStr) {
    if (!timeStr) return 0;
    if (!isNaN(timeStr)) return parseInt(timeStr);
    const parts = timeStr.split(":").map(part => parseInt(part));
    const result = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 1 ? parts[0] : 0;
    console.log(`%c[Konversi] Waktu ke detik: ${timeStr} -> ${result} detik`, "color: #38a169;");
    return result;
  }
  delay(ms) {
    console.log(`%c[Penundaan] Menunggu ${ms}ms...`, "color: #a0aec0;");
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async getVideoData(url) {
    this._validateLink(url);
    try {
      console.log(`%c[Permintaan] Mengambil data video dari: ${url}`, "color: #4a5568;");
      const response = await axios.get(`${this.cosmic_address}/video_info`, {
        params: {
          url: url
        }
      });
      const result = response.data.data;
      console.log(`%c[Respon] Data video diterima:`, "color: #38a169;");
      console.dir(result);
      return result;
    } catch (error) {
      const errorMessage = "Gagal mengambil metadata video: " + (error.response?.data?.message || error.message || error);
      console.error(`%c[Kesalahan] ${errorMessage}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(errorMessage);
    }
  }
  async startDownload(options) {
    try {
      console.log(`%c[Permintaan] Memulai unduhan dengan opsi:`, "color: #4a5568;");
      console.dir(options);
      const response = await axios.post(`${this.cosmic_address}/download/`, options);
      const result = response.data;
      console.log(`%c[Respon] Unduhan dimulai:`, "color: #38a169;");
      console.dir(result);
      return result;
    } catch (error) {
      const errorMessage = "Gagal memulai sequence unduhan: " + (error.response?.data?.message || error.message || error);
      console.error(`%c[Kesalahan] ${errorMessage}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(errorMessage);
    }
  }
  async getDownloadStatus(taskId) {
    if (!taskId) {
      const error = "ID tugas unduhan tidak teridentifikasi.";
      console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(error);
    }
    try {
      console.log(`%c[Permintaan] Memeriksa status unduhan untuk tugas: ${taskId}`, "color: #4a5568;");
      const response = await axios.get(`${this.cosmic_address}/download-status/${taskId}`);
      const result = response.data;
      console.log(`%c[Respon] Status unduhan:`, "color: #38a169;");
      console.dir(result);
      return result;
    } catch (error) {
      const errorMessage = "Gagal memantau status unduhan: " + (error.response?.data?.message || error.message || error);
      console.error(`%c[Kesalahan] ${errorMessage}`, "color: #e53e3e; font-weight: bold;");
      throw new Error(errorMessage);
    }
  }
  async processDownload(params) {
    try {
      this._validateLink(params.url);
      const {
        url,
        videoFormatId = null,
        audioFormatId = null,
        isTrim = false,
        startTime = "0",
        endTime = "0"
      } = params;
      const validatedVideoFormatId = this._validateId(videoFormatId, "videoFormatId");
      const validatedAudioFormatId = this._validateId(audioFormatId, "audioFormatId");
      if (!validatedVideoFormatId && !validatedAudioFormatId) {
        const error = "Paramenter protokol multimedia tidak mencukupi: diperlukan ID format video atau audio.";
        console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
        throw new Error(error);
      }
      const validatedIsTrim = this._validateLogic(isTrim, "isTrim");
      const videoInfo = await this.getVideoData(url);
      const downloadOptions = {
        url: url,
        is_trim: validatedIsTrim,
        format_id: validatedVideoFormatId || validatedAudioFormatId,
        audio_format_id: validatedAudioFormatId,
        start_time: validatedIsTrim ? this.convertToSeconds(startTime) : 0,
        end_time: validatedIsTrim ? this.convertToSeconds(endTime) : 0
      };
      if (validatedIsTrim) {
        const startTimeSeconds = this.convertToSeconds(startTime);
        const endTimeSeconds = this.convertToSeconds(endTime);
        if (endTimeSeconds > 0 && endTimeSeconds <= startTimeSeconds) {
          const error = "Konflik temporal: Waktu akhir harus melampaui waktu awal.";
          console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
          throw new Error(error);
        }
        if (videoInfo.duration && endTimeSeconds > videoInfo.duration) {
          const error = `Ambang waktu terlampaui: Waktu akhir (${endTimeSeconds} detik) melebihi durasi video (${videoInfo.duration} detik)`;
          console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
          throw new Error(error);
        }
      }
      const downloadTask = await this.startDownload(downloadOptions);
      if (!downloadTask.success) {
        const error = "Terjadi malfungsi pada server. Mohon periksa kembali koneksi Anda.";
        console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
        throw new Error(error);
      }
      if (downloadTask.state === "downloadable") {
        const result = {
          videoId: videoInfo.id,
          title: videoInfo.title,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail,
          url: downloadTask.data.downloadable_url
        };
        console.log(`%c[Berhasil] URL unduhan tersedia:`, "color: #38a169;");
        console.dir(result);
        return result;
      }
      const taskId = downloadTask.data.task_id;
      let isComplete = false;
      let downloadUrl = "";
      let attempts = 0;
      const maxAttempts = 100;
      while (!isComplete && attempts < maxAttempts) {
        const status = await this.getDownloadStatus(taskId);
        console.log(`%c[Status] ${status.progress}`, "color: #a0aec0;");
        if (status.state === "uploaded") {
          isComplete = true;
          downloadUrl = status.data.downloadable_url;
          console.log(`%c[Berhasil] Unduhan selesai, URL tersedia: ${downloadUrl}`, "color: #38a169;");
        } else if (status.state === "failed") {
          const error = "Unduhan gagal.";
          console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
          throw new Error(error);
        } else {
          attempts++;
          await this.delay(2e3);
        }
      }
      if (!isComplete) {
        const error = "Transmisi data tidak komplit. Silakan coba lagi dengan sumber yang berbeda.";
        console.error(`%c[Kesalahan] ${error}`, "color: #e53e3e; font-weight: bold;");
        throw new Error(error);
      }
      const result = {
        videoId: videoInfo.id,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        url: downloadUrl
      };
      console.log(`%c[Berhasil] Proses unduhan selesai:`, "color: #38a169;");
      console.dir(result);
      return result;
    } catch (error) {
      console.error(`%c[Kesalahan] ${error.message}`, "color: #e53e3e; font-weight: bold;");
      throw error;
    }
  }
  async getFormats(url) {
    this._validateLink(url);
    try {
      const videoInfo = await this.getVideoData(url);
      const audioFormats = videoInfo.formats.filter(({
        is_audio
      }) => is_audio).map(({
        is_audio,
        url,
        filesize,
        ...rest
      }) => ({
        ...rest,
        filesize: this.formatSize(filesize)
      }));
      const videoFormats = videoInfo.formats.filter(({
        is_audio
      }) => !is_audio).map(({
        is_audio,
        url,
        filesize,
        ...rest
      }) => ({
        ...rest,
        filesize: this.formatSize(filesize)
      }));
      const result = {
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        videoFormats: videoFormats,
        audioFormats: audioFormats
      };
      console.log(`%c[Berhasil] Format media tersedia:`, "color: #38a169;");
      console.dir(result);
      return result;
    } catch (error) {
      console.error(`%c[Kesalahan] ${error.message}`, "color: #e53e3e; font-weight: bold;");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new StellarDownloader();
    const result = await downloader.processDownload(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}