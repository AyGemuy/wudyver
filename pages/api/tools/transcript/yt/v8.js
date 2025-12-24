import axios from "axios";
import {
  Parser
} from "xml2js";
class YouTubeTranscript {
  constructor() {
    this.baseUrl = "https://transcriptgenerator.org/api/youtube";
    this.xmlParser = new Parser();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  parseId(url) {
    console.log("Mencoba mem-parsing ID video dari URL...");
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    const id = match?.[1] || url;
    console.log(`ID video yang berhasil di-parsing: ${id}`);
    return id;
  }
  async _fetchAndParseSubtitles(subtitleUrl) {
    if (!subtitleUrl) return [];
    console.log(`Mengambil data subtitle dari URL...`);
    try {
      const {
        data: xmlData
      } = await axios.get(subtitleUrl);
      const parsedXml = await this.xmlParser.parseStringPromise(xmlData);
      const lines = parsedXml?.transcript?.text || [];
      return lines.map(line => {
        const textContent = (line._ || "").replace(/\n/g, " ").trim();
        return {
          text: textContent,
          start: parseFloat(line.$.start),
          duration: parseFloat(line.$.dur)
        };
      });
    } catch (error) {
      console.error(`Gagal memproses subtitle: ${error.message}`);
      return [];
    }
  }
  async _parseResult(rawResult) {
    console.log("Mem-parsing hasil gabungan menjadi format yang lebih bersih...");
    const info = rawResult.info?.video_info;
    const videoDetails = {
      id: info?.id || null,
      title: info?.title || "No Title",
      description: info?.description || "",
      channel: info?.channelTitle || "Unknown Channel",
      viewCount: info?.viewCount || "0",
      likeCount: info?.likeCount || "0",
      thumbnail: info?.thumbnail?.pop()?.url || null
    };
    const subtitleUrl = rawResult.subtitles?.subtitles?.[0]?.url;
    const transcript = await this._fetchAndParseSubtitles(subtitleUrl);
    const relatedVideos = (rawResult.related_videos?.related_videos?.data || []).map(video => ({
      id: video.videoId,
      title: video.title,
      channel: video.channelTitle,
      published: video.publishedTimeText,
      viewCount: video.viewCountText,
      thumbnail: video.thumbnail?.pop()?.url || null
    })).filter(v => v.id);
    return {
      videoDetails: videoDetails,
      transcript: transcript,
      relatedVideos: relatedVideos
    };
  }
  async transcript({
    url,
    ...rest
  }) {
    console.log("Memulai proses untuk mendapatkan data video...");
    try {
      const videoId = this.parseId(url);
      const endpoints = ["info", "subtitles", "related-videos"];
      let combinedResult = {};
      for (const endpoint of endpoints) {
        try {
          const apiUrl = `${this.baseUrl}/${endpoint}?id=${videoId}`;
          console.log(`Mengirim permintaan ke: ${apiUrl}`);
          const response = await axios.get(apiUrl, {
            headers: {
              ...this.headers,
              referer: `https://transcriptgenerator.org/watch?v=${videoId}`,
              ...rest
            }
          });
          console.log(`Permintaan untuk endpoint '${endpoint}' berhasil.`);
          const data = response?.data || {};
          combinedResult[endpoint.replace("-", "_")] = data;
        } catch (error) {
          console.error(`Gagal mengambil data untuk endpoint: '${endpoint}'. Melewati...`);
        }
      }
      return await this._parseResult(combinedResult);
    } catch (error) {
      console.error("Terjadi kesalahan fatal selama proses:", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const api = new YouTubeTranscript();
    const result = await api.transcript(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}