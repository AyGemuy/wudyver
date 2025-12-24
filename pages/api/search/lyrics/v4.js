import axios from "axios";
class Musix {
  constructor() {
    this.api = {
      token: "https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0",
      search: "https://apic-desktop.musixmatch.com/ws/1.1/macro.search?app_id=web-desktop-app-v1.0&page_size=5&page=1&s_track_rating=desc&quorum_factor=1.0",
      lyrics: "https://apic-desktop.musixmatch.com/ws/1.1/track.subtitle.get?app_id=web-desktop-app-v1.0&subtitle_format=lrc"
    };
    this.tokenData = null;
  }
  async get(url) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: {
          authority: "apic-desktop.musixmatch.com",
          cookie: "AWSELBCORS=0; AWSELB=0;"
        }
      });
      return data;
    } catch (error) {
      throw new Error(`Error fetching data: ${error.message}`);
    }
  }
  async getToken() {
    const response = await this.get(this.api.token);
    const userToken = response?.message?.body?.user_token;
    if (!userToken) throw new Error("Failed to retrieve access token");
    this.tokenData = {
      user_token: userToken,
      expiration_time: Math.floor(Date.now() / 1e3) + 600
    };
  }
  async ensureToken() {
    if (!this.tokenData || this.tokenData.expiration_time < Math.floor(Date.now() / 1e3)) {
      await this.getToken();
    }
  }
  async searchTrack(query) {
    await this.ensureToken();
    const url = `${this.api.search}&q=${query}&usertoken=${this.tokenData.user_token}`;
    const response = await this.get(url);
    const trackList = response?.message?.body?.macro_result_list?.track_list;
    if (!trackList?.length) throw new Error("No tracks found");
    const track = trackList[0].track;
    return {
      id: track.track_id,
      details: response
    };
  }
  async getLyrics(trackId) {
    await this.ensureToken();
    const url = `${this.api.lyrics}&track_id=${trackId}&usertoken=${this.tokenData.user_token}`;
    const response = await this.get(url);
    const lyrics = response?.message?.body?.subtitle?.subtitle_body;
    if (!lyrics) throw new Error("Lyrics not found");
    return {
      lyrics: lyrics,
      details: response
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    id
  } = req.method === "GET" ? req.query : req.body;
  const musix = new Musix();
  try {
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search."
          });
        }
        const track = await musix.searchTrack(query);
        return res.status(200).json({
          result: track
        });
      case "lyrics":
        if (!id) {
          return res.status(400).json({
            error: "ID parameter is required for lyrics."
          });
        }
        const lyrics = await musix.getLyrics(id);
        return res.status(200).json({
          result: lyrics
        });
      default:
        if (query) {
          const trackResult = await musix.searchTrack(query);
          const lyricsResult = await musix.getLyrics(trackResult.id);
          return res.status(200).json({
            track: trackResult,
            lyrics: lyricsResult
          });
        }
        return res.status(400).json({
          error: "Invalid request. Provide an action, query, or ID."
        });
    }
  } catch (error) {
    console.error("Error handling request:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}