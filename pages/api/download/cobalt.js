import axios from "axios";
async function cobalt(config) {
  try {
    return await new Promise(async (resolve, reject) => {
      if (!(typeof config === "object")) return reject("invalid config input, config must be json object!");
      config = {
        url: config?.url || null,
        videoQuality: config?.videoQuality || "720",
        audioFormat: config?.audioFormat || "mp3",
        audioBitrate: config?.audioBitrate || "128",
        filenameStyle: config?.filenameStyle || "classic",
        downloadMode: config?.downloadMode || "auto",
        youtubeVideoCodec: config?.youtubeVideoCodec || "h264",
        youtubeDubLang: config?.youtubeDubLang || "en",
        alwaysProxy: config?.alwaysProxy || false,
        disableMetadata: config?.disableMetadata || false,
        tiktokFullAudio: config?.tiktokFullAudio || true,
        tiktokH265: config?.tiktokH265 || true,
        twitterGif: config?.twitterGif || true,
        youtubeHLS: config?.youtubeHLS || false
      };
      if (!config.url) return reject("missing url input!");
      axios.post("https://co.eepy.today/", config, {
        headers: {
          accept: "application/json",
          contentType: "application/json"
        }
      }).then(res => {
        const data = res.data;
        if (data.status === "error") return reject("failed fetch content");
        resolve({
          success: true,
          result: data
        });
      }).catch(e => {
        if (e?.response?.data) return reject(e.response.data.error);
        else return reject(e);
      });
    });
  } catch (e) {
    return {
      success: false,
      errors: e
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await cobalt({
    url: url
  });
  return res.status(200).json(typeof result === "object" ? result : result);
}