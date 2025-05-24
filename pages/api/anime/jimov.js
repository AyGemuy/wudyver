import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    provider,
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const baseURL = "https://jimov-api.vercel.app";
  if (!provider || !action) return res.status(400).json({
    error: "Provider and action are required"
  });
  const getUrl = (provider, action, params) => {
    switch (provider) {
      case "animeflv":
        return action === "filter" ? `${baseURL}/anime/animeflv/filter?${new URLSearchParams(params)}` : action === "name" ? `${baseURL}/anime/animeflv/name/${encodeURIComponent(params.name)}` : action === "episode" ? `${baseURL}/anime/animeflv/episode/${encodeURIComponent(params.episode)}` : "";
      case "animelatinohd":
        return action === "filter" ? `${baseURL}/anime/animelatinohd/filter?${new URLSearchParams(params)}` : action === "name" ? `${baseURL}/anime/animelatinohd/name/${encodeURIComponent(params.name)}` : action === "episode" ? `${baseURL}/anime/animelatinohd/episode/${encodeURIComponent(params.episode)}` : "";
      case "monoschinos":
        return action === "filter" ? `${baseURL}/anime/monoschinos/filter?${new URLSearchParams(params)}` : action === "name" ? `${baseURL}/anime/monoschinos/name/${encodeURIComponent(params.name)}` : action === "episode" ? `${baseURL}/anime/monoschinos/episode/${encodeURIComponent(params.episode)}` : "";
      case "inmanga":
        return action === "filter" ? `${baseURL}/manga/inmanga/filter?${new URLSearchParams(params)}` : action === "title" ? `${baseURL}/manga/inmanga/title/${encodeURIComponent(params.title)}` : action === "chapter" ? `${baseURL}/manga/inmanga/chapter/${encodeURIComponent(params.title)}?cid=${params.cid}` : "";
      case "mangareader":
        return action === "filter" ? `${baseURL}/manga/mangareader/filter?${new URLSearchParams(params)}` : action === "title" ? `${baseURL}/manga/mangareader/title/${encodeURIComponent(params.title)}` : action === "chapter" ? `${baseURL}/manga/mangareader/chapter/${encodeURIComponent(params.title)}?number=${params.number}&lang=${params.lang}` : "";
      case "manganelo":
        return action === "filter" ? `${baseURL}/manga/manganelo/filter?${new URLSearchParams(params)}` : action === "title" ? `${baseURL}/manga/manganelo/title/${encodeURIComponent(params.title)}` : action === "chapter" ? `${baseURL}/manga/manganelo/chapter/${encodeURIComponent(params.title)}?num=${params.num}` : "";
      case "tioanime":
        return action === "filter" ? `${baseURL}/anime/tioanime/filter?${new URLSearchParams(params)}` : action === "name" ? `${baseURL}/anime/tioanime/name/${encodeURIComponent(params.name)}` : action === "episode" ? `${baseURL}/anime/tioanime/episode/${encodeURIComponent(params.episode)}` : action === "last-episodes" ? `${baseURL}/anime/tioanime/last/episodes` : "";
      default:
        return "";
    }
  };
  try {
    const url = getUrl(provider, action, params);
    if (!url) return res.status(400).json({
      error: "Invalid provider or action"
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}