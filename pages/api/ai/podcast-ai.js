import axios from "axios";
class PodcastAI {
  constructor() {
    this.baseURL = "https://app.podcastai.com/api/v1/portal/shows/imagineai";
  }
  async search({
    query,
    limit = 5
  }) {
    try {
      const actualLimit = Math.min(limit, 5);
      const response = await axios.get(`${this.baseURL}/search3`, {
        params: {
          q: query
        },
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://podcast.imagineai.live",
          pragma: "no-cache",
          referer: "https://podcast.imagineai.live/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      if (response.data && response.data.data && response.data.data.episodes) {
        console.log("Search results:", response.data.data.episodes.slice(0, actualLimit));
        return {
          result: response.data.data.episodes.slice(0, actualLimit)
        };
      } else {
        console.warn("Unexpected API response structure for search:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Error during search:", error.message);
      throw error;
    }
  }
  async chat({
    id = "WdHlHrONdv7",
    prompt,
    audio = false,
    name = null,
    history = []
  }) {
    try {
      const payload = {
        userName: name,
        history: JSON.stringify(history),
        message: prompt,
        includeAudio: audio
      };
      const response = await axios.post(`${this.baseURL}/episodes/${id}/chat`, payload, {
        headers: {
          accept: "application/json",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://podcast.imagineai.live",
          pragma: "no-cache",
          referer: "https://podcast.imagineai.live/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      if (response.data) {
        console.log("Chat response:", response.data);
        return {
          result: response.data.data
        };
      } else {
        console.warn("Unexpected API response structure for chat:", response.data);
        return "Could not get a valid response from the chat API.";
      }
    } catch (error) {
      console.error("Error during chat:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const podcastAI = new PodcastAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await podcastAI[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await podcastAI[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | search`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}