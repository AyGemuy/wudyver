import axios from 'axios';

const apiUrl = 'https://api.aniskip.com';
const cacheSize = 20;
const cacheMaxAge = 24 * 60 * 60 * 1000;
const cache = new Map();

const createCache = () => {
  const cacheMap = new Map();
  return {
    get(key) {
      const item = cacheMap.get(key);
      if (item && Date.now() - item.timestamp < cacheMaxAge) {
        return item.value;
      }
      return undefined;
    },
    set(key, value) {
      if (cacheMap.size >= cacheSize) {
        const oldestKey = cacheMap.keys().next().value;
        cacheMap.delete(oldestKey);
      }
      cacheMap.set(key, { value, timestamp: Date.now() });
    },
  };
};

const fetchData = async (endpoint, cacheKey) => {
  const cacheInstance = createCache();
  const cachedData = cacheInstance.get(cacheKey);
  if (cachedData) return cachedData;

  try {
    const response = await axios.get(`${apiUrl}${endpoint}`);
    const data = response.data.results || response.data;
    cacheInstance.set(cacheKey, data);
    return data;
  } catch (error) {
    throw error;
  }
};

const fetchRecentEpisodes = async (type) => {
  return await fetchData(`/v1/recentepisode/${type}`, `recentEpisodes_${type}`);
};

const fetchTrendingAnime = async () => {
  return await fetchData(`/v2/trending`, 'trendingAnime');
};

const fetchPopularAnime = async () => {
  return await fetchData(`/v2/popular`, 'popularAnime');
};

const fetchTopAirAnime = async () => {
  return await fetchData(`/v1/topair?p=1`, 'topAirAnime');
};

const fetchAnimeDetails = async (id) => {
  return await fetchData(`/v2/info/${id}`, `animeDetails_${id}`);
};

const fetchSearchedAnime = async (query) => {
  const requestBody = { search: query };
  const cacheKey = `searchedAnime_${query}`;
  return await fetchData(`/v2/search`, cacheKey, requestBody);
};

const fetchAnimeEpisodes = async (id) => {
  return await fetchData(`/v1/episode/${id}`, `animeEpisodes_${id}`);
};

const fetchEpisodeStream = async (id) => {
  return await fetchData(`/v1/stream/${id}`, `episodeStream_${id}`);
};

const fetchAnimeRelations = async (id) => {
  const details = await fetchAnimeDetails(id);
  return details.relation.slice(0, 5);
};

const fetchAnimeRecommendations = async (id) => {
  return await fetchData(`/v2/recommendations/${id}`, `animeRecommendations_${id}`);
};

export default async function handler(req, res) {
  const { method, query } = req;
  const { type, id, query: searchQuery } = query;

  if (method !== 'GET') {
    res.status(405).json({ error: `Method ${method} Not Allowed` });
    return;
  }

  try {
    let data;

    if (type === 'search') {
      if (searchQuery) {
        data = await fetchSearchedAnime(searchQuery);
      } else {
        res.status(400).json({ error: 'Search query is required for search type' });
        return;
      }
    } else if (type === 'detail') {
      if (id) {
        data = await fetchAnimeDetails(id);
      } else {
        res.status(400).json({ error: 'Anime ID is required for detail type' });
        return;
      }
    } else if (type === 'recent') {
      if (searchQuery) {
        data = await fetchRecentEpisodes(searchQuery);
      } else {
        res.status(400).json({ error: 'Search query is required for recent episodes' });
        return;
      }
    } else if (type === 'trending') {
      data = await fetchTrendingAnime();
    } else if (type === 'popular') {
      data = await fetchPopularAnime();
    } else if (type === 'topair') {
      data = await fetchTopAirAnime();
    } else {
      res.status(400).json({ error: 'Invalid query type' });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
