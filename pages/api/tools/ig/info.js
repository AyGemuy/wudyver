import axios from "axios";
const getInstagramUserID = async username => {
  try {
    const response = await axios.post("https://ig.informatikamu.id/fitur/followers-instagram-gratis?formType=findUserID", new URLSearchParams({
      username: username
    }), {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        accept: "application/json, text/javascript, */*; q=0.01",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        cookie: "6cb5735c89fabe72c99ae6ce238469d5=kdisqftmm6rmc6au872smie4pn",
        referer: "https://ig.informatikamu.id/fitur/followers-instagram-gratis"
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching Instagram user ID:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "Username parameter is required"
    });
  }
  try {
    const result = await getInstagramUserID(username);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch Instagram user ID"
    });
  }
}