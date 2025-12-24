import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const cookieJar = new CookieJar();
const client = wrapper(axios.create({
  jar: cookieJar,
  withCredentials: true
}));
class FreefyAPI {
  constructor() {
    this.baseURL = "https://freefy.app/api/v1";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://freefy.app/search",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.xsrfToken = null;
    this.isSessionRefreshed = false;
  }
  async updateHeaders() {
    try {
      const cookies = await cookieJar.getCookies(this.baseURL);
      const xsrfCookie = cookies.find(cookie => cookie.key === "XSRF-TOKEN");
      if (xsrfCookie) {
        this.xsrfToken = decodeURIComponent(xsrfCookie.value);
        this.headers["x-xsrf-token"] = this.xsrfToken;
      }
    } catch (error) {
      console.error("Error updating headers:", error.message);
    }
  }
  async makeRequest(url, options = {}) {
    try {
      await this.updateHeaders();
      const response = await client({
        url: url,
        headers: this.headers,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error("Request error:", error.message);
      if (error.response?.status === 419 || error.response?.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }
      throw error;
    }
  }
  async refreshSession() {
    try {
      console.log("Refreshing session...");
      await cookieJar.removeAllCookies();
      await client.get("https://freefy.app", {
        headers: {
          "user-agent": this.headers["user-agent"],
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9"
        }
      });
      await this.updateHeaders();
      this.isSessionRefreshed = true;
      console.log("Session refreshed successfully");
    } catch (error) {
      console.error("Error refreshing session:", error.message);
      throw error;
    }
  }
  async search({
    query,
    limit = 3,
    page = 1,
    ...rest
  }) {
    try {
      const params = new URLSearchParams({
        loader: "searchPage",
        query: query,
        page: page.toString()
      });
      const response = await this.makeRequest(`${this.baseURL}/search?${params}`, {
        method: "GET"
      });
      if (!response.results || !response.results.tracks) {
        throw new Error("Invalid response format");
      }
      const tracks = response.results.tracks.data.filter(track => track.name && track.artists && track.artists.length > 0).map(track => ({
        id: track.id,
        name: track.name,
        duration: track.duration,
        plays: track.plays,
        album: track.album ? {
          id: track.album.id,
          name: track.album.name,
          image: track.album.image,
          release_date: track.album.release_date
        } : null,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          image_small: artist.image_small
        }))
      })).slice(0, limit);
      return {
        query: response.query,
        tracks: tracks,
        current_page: response.results.tracks.current_page,
        has_more: response.results.tracks.data.length > limit
      };
    } catch (error) {
      console.error("Error in search:", error.message);
      throw error;
    }
  }
  async getLyrics(trackId, duration = null) {
    try {
      const params = duration ? new URLSearchParams({
        duration: duration.toString()
      }) : "";
      const url = `${this.baseURL}/tracks/${trackId}/lyrics${params ? `?${params}` : ""}`;
      const response = await this.makeRequest(url, {
        method: "GET"
      });
      return response;
    } catch (error) {
      console.error("Error getting lyrics:", error.message);
      throw error;
    }
  }
  async searchWithLyrics({
    query,
    limit = 3,
    ...rest
  }) {
    let retryCount = 0;
    const maxRetries = 1;
    while (retryCount <= maxRetries) {
      try {
        if (!this.isSessionRefreshed && retryCount === 0) {
          await this.refreshSession();
        }
        const searchResults = await this.search({
          query: query,
          limit: limit,
          ...rest
        });
        const tracksWithLyrics = [];
        for (const track of searchResults.tracks.slice(0, limit)) {
          try {
            const lyrics = await this.getLyrics(track.id, track.duration);
            tracksWithLyrics.push({
              ...track,
              lyrics: lyrics
            });
          } catch (error) {
            console.error(`Failed to get lyrics for track ${track.id}:`, error.message);
            tracksWithLyrics.push({
              ...track,
              lyrics: null,
              error: error.message
            });
          }
        }
        return {
          query: searchResults.query,
          tracks: tracksWithLyrics,
          current_page: searchResults.current_page,
          has_more: searchResults.has_more
        };
      } catch (error) {
        retryCount++;
        if (error.message === "SESSION_EXPIRED" && retryCount <= maxRetries) {
          console.log("Session expired, attempting to refresh...");
          this.isSessionRefreshed = false;
          continue;
        }
        console.error("Error in searchWithLyrics:", error.message);
        throw error;
      }
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
    const freefyAPI = new FreefyAPI();
    const response = await freefyAPI.searchWithLyrics(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}