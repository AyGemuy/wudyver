import axios from "axios";
class AxiosClient {
  constructor() {
    this.keys = ["dZ9r6H3UA3VRZ44pe3alaokSD4p2qYmYDN4pbNIbV2WGFUhNlYJhG5tm", "563492ad6f91700001000001e82bd3aea51a4f18a30b09ce81aacb33"];
    this.cfg = {
      baseURL: "https://api.pexels.com/",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        origin: "https://www.freeaivideogen.fun",
        referer: "https://www.freeaivideogen.fun/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
    this.endpoints = {
      search_photos: {
        path: "v1/search",
        params: ["query", "per_page"]
      },
      curated_photos: {
        path: "v1/curated",
        params: ["per_page"]
      },
      get_photo: {
        path: "v1/photos",
        params: ["id"]
      },
      search_videos: {
        path: "videos/search",
        params: ["query", "per_page"]
      },
      popular_videos: {
        path: "videos/popular",
        params: ["per_page"]
      },
      get_video: {
        path: "videos/videos",
        params: ["id"]
      }
    };
  }
  async run({
    type,
    ...rest
  }) {
    const validTypes = Object.keys(this.endpoints);
    const selectedType = validTypes.includes(type) ? type : "search_photos";
    if (!type || !validTypes.includes(type)) {
      const typeInfo = validTypes.map(t => `${t}: ${this.endpoints[t].params.join(", ")}`).join("; ");
      throw new Error(JSON.stringify({
        error: "InvalidType",
        message: `Invalid or empty type: ${type || "none"}. Valid types and required params: ${typeInfo}. Defaulting to search_photos`
      }));
    }
    console.log(`Starting type: ${selectedType}`);
    const endpoint = this.endpoints[selectedType];
    const isSpecificResource = ["get_photo", "get_video"].includes(selectedType);
    const url = isSpecificResource ? `${endpoint.path}/${rest.id || ""}` : endpoint.path;
    const missingParams = endpoint.params.filter(param => !rest[param] && !["query", "per_page"].includes(param));
    if (missingParams.length > 0) {
      throw new Error(JSON.stringify({
        error: "MissingParamenters",
        message: `Missing required parameters for ${selectedType}: ${missingParams.join(", ")}`
      }));
    }
    for (const key of this.keys) {
      try {
        console.log(`Attempting with key: ${key.slice(0, 8)}...`);
        const res = await axios.get(url, {
          ...this.cfg,
          headers: {
            ...this.cfg.headers,
            authorization: key
          },
          params: isSpecificResource ? {} : {
            query: rest.query || "nature",
            per_page: rest.per_page || 1,
            ...rest
          }
        });
        console.log("Request successful:", res?.data?.photos?.length || res?.data?.videos?.length || 1, "items found");
        return res?.data?.photos || res?.data?.videos || res?.data || [];
      } catch (err) {
        throw new Error(JSON.stringify({
          error: "RequestFailed",
          message: `Error with key ${key.slice(0, 8)}...: ${err?.response?.status || "Unknown error"}`
        }));
      }
    }
    throw new Error(JSON.stringify({
      error: "AllKeysFailed",
      message: "All keys failed, returning empty result"
    }));
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new AxiosClient();
    const response = await api.run(params);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}