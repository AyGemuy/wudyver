import axios from "axios";
const KITSU_URI = "https://kitsu.io/api/edge/";
const fetchKitsuData = async url => {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json"
      }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.errors || error.message);
  }
};
export default async function handler(req, res) {
  const {
    action,
    query = "",
    offset = "0"
  } = req.method === "GET" ? req.query : req.body;
  let url = "";
  switch (action) {
    case "searchAnime":
      url = `${KITSU_URI}anime?filter[text]=${query}&page[offset]=${offset}`;
      break;
    case "listAnime":
      url = `${KITSU_URI}anime?page[limit]=10&page[offset]=${offset}`;
      break;
    case "searchManga":
      url = `${KITSU_URI}manga?filter[text]=${query}&page[offset]=${offset}`;
      break;
    case "listManga":
      url = `${KITSU_URI}manga?page[limit]=10&page[offset]=${offset}`;
      break;
    case "searchDrama":
      url = `${KITSU_URI}drama?filter[text]=${query}&page[offset]=${offset}`;
      break;
    case "listDrama":
      url = `${KITSU_URI}drama?page[limit]=10&page[offset]=${offset}`;
      break;
    case "listUsers":
      url = `${KITSU_URI}users?page[limit]=10&page[offset]=${offset}`;
      break;
    case "getUser":
      url = `${KITSU_URI}users?filter[slug]=${query}`;
      break;
    case "listGenres":
      url = `${KITSU_URI}genres?page[limit]=10&page[offset]=${offset}`;
      break;
    case "findCharacter":
      url = `${KITSU_URI}characters?filter[name]=${query}&page[limit]=10&page[offset]=${offset}`;
      break;
    default:
      return res.status(400).json({
        error: "Invalid action parameter"
      });
  }
  try {
    const data = await fetchKitsuData(url);
    return res.status(200).json({
      data: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}