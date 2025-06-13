import axios from "axios";
class MusicFinder {
  async search(params) {
    const {
      service,
      query,
      url,
      quality,
      extension,
      title,
      pageToken,
      folder
    } = params;
    const endpoints = {
      1: `https://backendace.1010diy.com/web/free-mp3-finder/query`,
      2: `https://backendace.1010diy.com/web/free-mp3-finder/detail`,
      3: `https://stream_ace1.1010diy.com/download`,
      4: `https://line.1010diy.com/web/free-mp3-finder/query`,
      5: `https://your-query.myfreemp3.icu/`,
      6: `https://songslover.vip/`,
      7: `https://justnaija.com/search`,
      8: `https://myfreemp3juices.cc/api/search.php`,
      9: `https://idmp3s.com/api/vip/get_song.php`,
      10: `https://www.mp3-juices.plus/mp3`,
      11: `https://www.mp3juices3.cc/`,
      12: `https://mp3-juice.com/api.php`,
      13: `https://mp3quack.app/mp3`,
      14: `https://tubidy.dj/`
    };
    if (!endpoints[service]) throw new Error("Invalid service specified");
    const paramsObj = {
      1: {
        q: query,
        type: "youtube",
        pageToken: pageToken
      },
      2: {
        url: url,
        phonydata: false
      },
      3: {
        url: url,
        quality: quality,
        ext: extension,
        title: title
      },
      4: {
        q: query,
        type: "youtube",
        pageToken: pageToken
      },
      6: {
        s: query
      },
      7: {
        q: query,
        folder: folder
      },
      8: {
        q: query,
        page: 0
      },
      9: {
        id: query
      },
      10: {
        q: query
      },
      11: {
        query: query
      },
      12: {
        q: query
      },
      13: {
        q: query
      },
      14: {
        q: query
      }
    };
    const response = await axios({
      method: service === "8" || service === "11" || service === "14" ? "post" : "get",
      url: endpoints[service],
      params: service !== "8" && service !== "11" && service !== "14" ? paramsObj[service] : undefined,
      data: service === "8" || service === "11" || service === "14" ? paramsObj[service] : undefined
    });
    return response.data;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.service) return res.status(400).json({
    error: "Service parameter is required."
  });
  if (["1", "4", "6", "7", "8", "10", "12", "13"].includes(params.service) && !params.query) {
    return res.status(400).json({
      error: "Query parameter is required."
    });
  }
  if (["2", "3", "9"].includes(params.service) && !params.url) {
    return res.status(400).json({
      error: "URL parameter is required."
    });
  }
  if (params.service === "3" && (!params.quality || !params.extension || !params.title)) {
    return res.status(400).json({
      error: "Quality, extension, and title parameters are required."
    });
  }
  try {
    const musicAPI = new MusicFinder();
    const result = await musicAPI.search(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}