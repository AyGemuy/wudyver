import axios from "axios";
const sendInstagramFollowers = async data => {
  try {
    const response = await axios.post("https://ig.informatikamu.id/fitur/followers-instagram-gratis?formType=send", new URLSearchParams(data), {
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
    console.error("Error sending Instagram followers:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    jumlah_followers,
    user_id,
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!jumlah_followers || !user_id || !username) {
    return res.status(400).json({
      error: "jumlah_followers, user_id, and username parameters are required"
    });
  }
  const data = {
    jumlah_followers: jumlah_followers,
    user_id: user_id,
    username: username
  };
  try {
    const result = await sendInstagramFollowers(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to send Instagram followers"
    });
  }
}