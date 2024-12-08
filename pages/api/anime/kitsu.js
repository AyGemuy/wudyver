import axios from 'axios';

const baseUrl = 'https://api.animos.cf';
const client = axios.create({ baseURL: baseUrl });

const getId = async (malId, externalService) => {
  try {
    const response = await client.get(`/mappings/${malId}`);
    const map = response.data;
    return map[externalService];
  } catch (error) {
    throw new Error(`Error fetching mapping for MAL ID ${malId}`);
  }
};

const getKitsuId = async (malId) => {
  const kitsuId = await getId(malId, 'kitsu_id');
  if (!kitsuId) throw new Error('Kitsu ID is missing for anime: ' + malId);
  return kitsuId;
};

const getData = async (malId) => {
  try {
    const kitsuId = await getKitsuId(malId);
    const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`);
    const anime = response.data;
    if (anime) {
      return anime;
    } else {
      return '';
    }
  } catch (err) {
    console.log("Failed to fetch poster for", malId);
    return '';
  }
};

export default async function handler(req, res) {
  const { method, query } = req;
  const { malId } = query;

  if (method !== 'GET') {
    res.status(405).json({ error: `Method ${method} Not Allowed` });
    return;
  }

  if (!malId) {
    res.status(400).json({ error: 'MAL ID is required' });
    return;
  }

  try {
    const result = await getData(Number(malId));
    res.status(200).json({ malId, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
