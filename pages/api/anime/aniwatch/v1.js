import fetch from "node-fetch";
class AniWatch {
  async parseData() {
    try {
      const response = await fetch("https://aniwatch-api-v1-0.onrender.com/api/parse");
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error parsing data: " + err.message);
    }
  }
  async search(query, page) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/search/${encodeURIComponent(query)}/${page}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error searching: " + err.message);
    }
  }
  async getGenre(genre, page) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/genre/${genre}/${page}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching genre: " + err.message);
    }
  }
  async getSchedule(date) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/shedule/${date}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching schedule: " + err.message);
    }
  }
  async getRelated(id) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/related/${id}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching related: " + err.message);
    }
  }
  async getMix(query, page) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/mix/${query}/${page}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching mix: " + err.message);
    }
  }
  async getEpisode(id) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/episode/${id}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching episode: " + err.message);
    }
  }
  async getServer(epId) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/server/${epId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching server data: " + err.message);
    }
  }
  async getSrcServer(srcId) {
    try {
      const response = await fetch(`https://aniwatch-api-v1-0.onrender.com/api/src-server/${srcId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error("Error fetching src server data: " + err.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    page = 1,
    genre,
    date,
    id,
    epId,
    srcId
  } = req.method === "GET" ? req.query : req.body;
  const aniWatch = new AniWatch();
  try {
    let result;
    if (action === "parse") {
      result = await aniWatch.parseData();
    } else if (action === "search" && query && page) {
      result = await aniWatch.search(query, page);
    } else if (action === "genre" && genre && page) {
      result = await aniWatch.getGenre(genre, page);
    } else if (action === "schedule" && date) {
      result = await aniWatch.getSchedule(date);
    } else if (action === "related" && id) {
      result = await aniWatch.getRelated(id);
    } else if (action === "mix" && query && page) {
      result = await aniWatch.getMix(query, page);
    } else if (action === "episode" && id) {
      result = await aniWatch.getEpisode(id);
    } else if (action === "server" && epId) {
      result = await aniWatch.getServer(epId);
    } else if (action === "src-server" && srcId) {
      result = await aniWatch.getSrcServer(srcId);
    } else {
      return res.status(400).json({
        error: "Invalid action or missing parameters"
      });
    }
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}