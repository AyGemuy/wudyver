import axios from "axios";
class LoveTik {
  constructor() {
    this.base = "https://lovetik.com";
    this.api = "https://lovetik.com/api/ajax";
    this.headers = {
      "user-agent": "Postify/1.0.0",
      origin: this.base,
      referer: `${this.base}/`,
      "x-requested-with": "XMLHttpRequest"
    };
  }
  validLink(url) {
    if (!url || typeof url !== "string") throw new Error("Link tidak valid.");
    const regex = /^(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\/(@[\w.-]+\/video\/\d+|\w+)/;
    if (!regex.test(url)) throw new Error("Link tidak sesuai format.");
  }
  async search(url) {
    try {
      this.validLink(url);
      const response = await axios.post(`${this.api}/search`, `query=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      return response.data;
    } catch (err) {
      console.log(err.message);
      throw err;
    }
  }
  async convert(cData) {
    try {
      const response = await axios.post(`${this.api}/convert`, `c_data=${encodeURIComponent(cData)}`, {
        headers: this.headers
      });
      return response.data;
    } catch (err) {
      console.log(err.message);
      throw err;
    }
  }
  clean(text) {
    return text?.replace(/<\/?b>/g, "").trim();
  }
  process(output) {
    const result = {
      videoId: output.vid,
      cover: output.cover,
      description: output.desc,
      author: {
        username: output.author,
        nickname: output.author_name,
        avatar: output.author_a
      },
      media: {
        images: output.images?.map(url => ({
          url: url
        })) || [],
        videos: [],
        audios: []
      }
    };
    output.links?.forEach(link => {
      const type = this.clean(link.t);
      if (type?.includes("MP4") || type?.includes("Video")) {
        result.media.videos.push({
          type: type,
          format: link.ft,
          size: link.s,
          url: link.a,
          converting: !!link.c,
          c: link.c
        });
      } else if (type?.includes("MP3") || type?.includes("Audio")) {
        result.media.audios.push({
          type: type,
          format: link.ft,
          title: link.s,
          url: link.a,
          converting: !!link.c,
          c: link.c
        });
      } else if (link.c) {
        result.media.videos.push({
          type: type || "Video",
          format: link.ft,
          size: link.s,
          url: link.a,
          converting: true,
          c: link.c
        });
      }
    });
    return result;
  }
  async download(url) {
    try {
      this.validLink(url);
      const output = await this.search(url);
      const result = this.process(output);
      const converts = [...result.media.videos, ...result.media.audios];
      await Promise.all(converts.map(async media => {
        if (media.converting) {
          const response = await this.convert(media.c);
          media.url = response.link;
          delete media.converting;
          delete media.c;
        }
      }));
      return result;
    } catch (err) {
      console.log(err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      success: false,
      message: "URL diperlukan."
    });
    const lovetik = new LoveTik();
    try {
      lovetik.validLink(url);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    const result = await lovetik.download(url);
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}