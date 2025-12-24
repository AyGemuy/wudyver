import axios from "axios";
class CleanvoiceAI {
  constructor() {
    this.baseUrl = "https://upload.cleanvoice.ai";
    this.appBaseUrl = "https://app.cleanvoice.ai/api";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://app.cleanvoice.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://app.cleanvoice.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getData(audioUrl) {
    try {
      console.log(`Mendapatkan data audio dari: ${audioUrl}`);
      const response = await axios.get(audioUrl, {
        responseType: "arraybuffer"
      });
      const audioData = response.data;
      const mimeType = response.headers["content-type"] || "audio/mpeg";
      const filename = audioUrl.split("/").pop();
      console.log(`Data audio berhasil didapatkan: ${filename} (${mimeType}, ${audioData.byteLength} bytes)`);
      return {
        audioData: audioData,
        mimeType: mimeType,
        filename: filename
      };
    } catch (error) {
      console.error("Gagal mendapatkan data audio:", error.message);
      return null;
    }
  }
  async initiateMultipartUpload(filename, type) {
    const url = `${this.baseUrl}/s3/multipart`;
    const headers = {
      ...this.headers,
      "content-type": "application/json"
    };
    try {
      console.log("Initiating multipart upload...");
      const response = await axios.post(url, {
        filename: filename,
        type: type,
        metadata: {}
      }, {
        headers: headers
      });
      console.log("Initiate multipart upload response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error initiating multipart upload:", error.message, error.response?.data);
      return null;
    }
  }
  async getUploadUrl(uploadId, key) {
    const url = `${this.baseUrl}/s3/multipart/${uploadId}/1?key=${encodeURIComponent(key)}`;
    try {
      console.log("Getting upload URL...");
      const response = await axios.get(url, {
        headers: this.headers
      });
      console.log("Get upload URL response:", response.data.url);
      return response.data.url;
    } catch (error) {
      console.error("Error getting upload URL:", error.message, error.response?.data);
      return null;
    }
  }
  async uploadPart(uploadUrl, audioBuffer, contentType) {
    const headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Length": audioBuffer.length.toString(),
      "Content-Type": contentType,
      Origin: "https://app.cleanvoice.ai",
      Pragma: "no-cache",
      Referer: "https://app.cleanvoice.ai/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
    try {
      console.log("Uploading part...");
      const response = await axios.put(uploadUrl, audioBuffer, {
        headers: headers
      });
      console.log("Upload part response status:", response.status, "etag:", response.headers.etag);
      return response.headers.etag;
    } catch (error) {
      console.error("Error uploading part:", error.message, error.response?.data);
      return null;
    }
  }
  async completeMultipartUpload(uploadId, key, etag) {
    const url = `${this.baseUrl}/s3/multipart/${uploadId}/complete?key=${encodeURIComponent(key)}`;
    const headers = {
      ...this.headers,
      "content-type": "application/json"
    };
    try {
      console.log("Completing multipart upload...");
      const response = await axios.post(url, {
        parts: [{
          PartNumber: 1,
          "content-length": "0",
          etag: etag,
          ETag: etag
        }]
      }, {
        headers: headers
      });
      console.log("Complete multipart upload response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error completing multipart upload:", error.message, error.response?.data);
      return null;
    }
  }
  async createGuestJob(fileKey) {
    const url = `${this.appBaseUrl}/guest_job`;
    const headers = {
      ...this.headers,
      "content-type": "application/json",
      authorization: "Bearer"
    };
    delete headers["sec-fetch-site"];
    const data = {
      input: {
        files: [fileKey],
        upload_type: "single track",
        config: {
          export_timestamps: true,
          audio_for_edl: false,
          fillers: true,
          stutters: true,
          mouth_sounds: true,
          hesitations: true,
          long_silences: true,
          remove_noise: true,
          keep_music: false,
          breath: "mute",
          transcription: false,
          summarize: false,
          social_content: false,
          muted: false,
          mute_lufs: -120,
          normalize: true,
          merge: false,
          target_lufs: -16,
          remove_bleed: false,
          export_format: "auto",
          autoeq: false,
          studio_sound: false,
          automix: false,
          hard_edit: false
        }
      }
    };
    try {
      console.log("Creating guest job...");
      const response = await axios.post(url, data, {
        headers: headers
      });
      console.log("Create guest job response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error creating guest job:", error.message, error.response?.data);
      return null;
    }
  }
  async getGuestJobStatus(taskId) {
    const url = `${this.appBaseUrl}/guest_status?task_id=${taskId}`;
    const headers = {
      ...this.headers
    };
    delete headers["origin"];
    delete headers["sec-fetch-site"];
    try {
      console.log("Getting guest job status for task ID:", taskId);
      const response = await axios.get(url, {
        headers: headers
      });
      console.log("Guest job status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error getting guest job status:", error.message, error.response?.data);
      return null;
    }
  }
  async getFilePreview(uploadId) {
    const url = `${this.appBaseUrl}/file_preview?upload_id=${uploadId}`;
    const headers = {
      ...this.headers
    };
    delete headers["origin"];
    delete headers["sec-fetch-site"];
    headers["baggage"] = "sentry-environment=vercel-production,sentry-release=40a959a988fd88ffb697c13544fa537aaf67e564,sentry-public_key=e4b0b39a09df43eabd29f4751a43be4f,sentry-trace_id=YOUR_SENTRY_TRACE_ID,sentry-sample_rate=1,sentry-transaction=%2Fbeta,sentry-sampled=true";
    headers["priority"] = "u=1, i";
    headers["referer"] = `https://app.cleanvoice.ai/file_preview?upload_id=${uploadId}&cleanining=completed`;
    headers["sentry-trace"] = "YOUR_SENTRY_TRACE_ID-YOUR_PARENT_SPAN_ID-1";
    try {
      console.log("Getting file preview for upload ID:", uploadId);
      const response = await axios.get(url, {
        headers: headers
      });
      console.log("Get file preview response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error getting file preview:", error.message, error.response?.data);
      return null;
    }
  }
  async processAudioData(audioData, filename, mimeType = "audio/mpeg") {
    try {
      const uploadInfo = await this.initiateMultipartUpload(filename, mimeType);
      if (!uploadInfo?.key || !uploadInfo?.uploadId) return null;
      const uploadUrl = await this.getUploadUrl(uploadInfo.uploadId, uploadInfo.key);
      if (!uploadUrl) return null;
      const etag = await this.uploadPart(uploadUrl, audioData, mimeType);
      if (!etag) return null;
      const completeResult = await this.completeMultipartUpload(uploadInfo.uploadId, uploadInfo.key, etag);
      if (!completeResult) return null;
      const guestJobResult = await this.createGuestJob(uploadInfo.key);
      if (!guestJobResult?.uploads?.[0]?.task_id) return null;
      const taskId = guestJobResult.uploads[0].task_id;
      while (true) {
        const statusResult = await this.getGuestJobStatus(taskId);
        if (!statusResult) return null;
        if (statusResult.status === "SUCCESS") {
          return await this.getFilePreview(statusResult.result.upload_id);
        }
        if (statusResult.status === "FAILED") return null;
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      console.error("Error during audio processing:", error.message);
      return null;
    }
  }
  async denoiseAudio({
    audioUrl
  }) {
    try {
      const audioInfo = await this.getData(audioUrl);
      if (audioInfo) {
        const {
          audioData,
          mimeType,
          filename
        } = audioInfo;
        const result = await this.processAudioData(audioData, filename, mimeType);
        if (result) {
          console.log("Cleanvoice processing complete. Preview:", result);
          return result;
        } else {
          console.log("Failed to process audio with Cleanvoice.");
          return null;
        }
      } else {
        console.log("Gagal memproses audio karena masalah dalam mendapatkan data.");
        return null;
      }
    } catch (error) {
      console.error("Terjadi kesalahan umum:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audioUrl) {
    return res.status(400).json({
      error: "audioUrl are required"
    });
  }
  try {
    const cleanvoice = new CleanvoiceAI();
    const response = await cleanvoice.denoiseAudio(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}