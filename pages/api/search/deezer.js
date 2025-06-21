import axios from "axios";
class DeezerAPI {
  constructor() {
    this.baseURL = "https://api.deezer.com/2.0";
  }
  async search(query) {
    if (!query) return {
      success: false,
      message: 'Query parameter "q" is required'
    };
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: "Error fetching data",
        error: error.message
      };
    }
  }
  async getTrack(id) {
    if (!id) return {
      success: false,
      message: "Track ID is required"
    };
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/track/${id}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: "Error fetching track",
        error: error.message
      };
    }
  }
  async getAlbum(id) {
    if (!id) return {
      success: false,
      message: "Album ID is required"
    };
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/album/${id}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: "Error fetching album",
        error: error.message
      };
    }
  }
  async getGenre(id) {
    if (!id) return {
      success: false,
      message: "Genre ID is required"
    };
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/genre/${id}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: "Error fetching genre",
        error: error.message
      };
    }
  }
  async getTrackByISRC(isrc) {
    if (!isrc) return {
      success: false,
      message: "ISRC code is required"
    };
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/track/isrc:${isrc}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: "Error fetching track by ISRC",
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    q,
    id,
    isrc
  } = req.method === "GET" ? req.query : req.body;
  const deezer = new DeezerAPI();
  try {
    let result;
    switch (action) {
      case "search":
        result = await deezer.search(q);
        break;
      case "track":
        result = await deezer.getTrack(id);
        break;
      case "album":
        result = await deezer.getAlbum(id);
        break;
      case "genre":
        result = await deezer.getGenre(id);
        break;
      case "isrc":
        result = await deezer.getTrackByISRC(isrc);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}