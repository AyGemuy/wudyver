import axios from "axios";
class AudioAtlasService {
  constructor() {
    this.baseURL = "https://api.audioatlas.com";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.audioatlas.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.audioatlas.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getRecommendations({
    prompt,
    license = false,
    beta = true,
    limit = 3
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/audioatlas`, {
        data: {
          attributes: {
            prompt: prompt,
            licensable: license,
            beta: beta
          }
        }
      }, {
        headers: this.headers
      });
      const attributes = response.data?.data?.attributes || [];
      return limit !== undefined ? attributes.slice(0, limit) : attributes;
    } catch (error) {
      console.error("Gagal mendapatkan rekomendasi:", error);
      return [];
    }
  }
  async getSongDetails(query) {
    try {
      const response = await axios.post(`${this.baseURL}/audioatlas/deezer-v2`, {
        data: {
          attributes: {
            query: query
          }
        }
      }, {
        headers: this.headers
      });
      return response.data?.data?.attributes || null;
    } catch (error) {
      console.error(`Gagal mendapatkan detail lagu untuk "${query}":`, error);
      return null;
    }
  }
  async generate({
    prompt,
    license,
    beta,
    limit
  }) {
    const recommendations = await this.getRecommendations({
      prompt: prompt,
      license: license,
      beta: beta,
      limit: limit
    });
    const result = [];
    for (const title of recommendations) {
      const songDetails = await this.getSongDetails(title);
      if (songDetails) {
        const imageId = songDetails.ALB_PICTURE;
        const previewUrl = songDetails?.MEDIA?.[0]?.HREF;
        result.push({
          title: songDetails.SNG_TITLE || "Judul Tidak Tersedia",
          artist: songDetails.ART_NAME || "Artis Tidak Tersedia",
          album: songDetails.ALB_TITLE || "Album Tidak Tersedia",
          image: imageId ? `https://e-cdn-images.dzcdn.net/images/cover/${imageId}/264x264-000000-80-0-0.jpg` : null,
          audio: previewUrl || null,
          duration: songDetails.DURATION || 0,
          isrc: songDetails.ISRC || "",
          explicitLyrics: songDetails.EXPLICIT_LYRICS === "1",
          releaseDate: songDetails.DATE_START || "",
          contributors: songDetails.SNG_CONTRIBUTORS || {},
          trackNumber: songDetails.TRACK_NUMBER || 0,
          diskNumber: songDetails.DISK_NUMBER || 0,
          genreId: songDetails.TYPE || 0,
          rank: songDetails.RANK_SNG || 0,
          artistPicture: songDetails.ART_PICTURE ? `https://e-cdn-images.dzcdn.net/images/artist/${songDetails.ART_PICTURE}/264x264-000000-80-0-0.jpg` : null,
          albumPicture: songDetails.ALB_PICTURE ? `https://e-cdn-images.dzcdn.net/images/cover/${songDetails.ALB_PICTURE}/264x264-000000-80-0-0.jpg` : null
        });
      }
    }
    return {
      total: recommendations.length,
      result: result
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const audioAtlasService = new AudioAtlasService();
    const response = await audioAtlasService.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}