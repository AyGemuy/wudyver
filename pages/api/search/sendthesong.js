import fetch from "node-fetch";
const headers = {
  Accept: "*/*",
  Origin: "https://sendthesong.xyz",
  Referer: "https://sendthesong.xyz/",
  "User-Agent": "Postify/1.0.0",
  Authority: "api.sendthesong.xyz"
};
export default async function handler(req, res) {
  const {
    name,
    page = 1,
    limit = 15
  } = req.method === "GET" ? req.query : req.body;
  if (!name) {
    return res.status(400).json({
      error: 'Paramenter "name" wajib diisi.'
    });
  }
  const params = new URLSearchParams({
    q: name,
    page: page,
    limit: limit
  });
  try {
    const response = await fetch(`https://api.sendthesong.xyz/api/posts?${params.toString()}`, {
      method: "GET",
      headers: headers
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch data"
      });
    }
    const data = await response.json();
    const {
      status,
      message,
      data: songData,
      total,
      page: currentPage,
      limit: currentLimit,
      offset
    } = data;
    const result = songData.map(item => ({
      id: item._id,
      recipient: item.recipient,
      message: item.message,
      songName: item.song_name,
      songArtist: item.song_artist,
      songImage: item.song_image
    }));
    return res.status(200).json({
      status: status,
      message: message,
      data: result,
      total: total,
      page: currentPage,
      limit: currentLimit,
      offset: offset
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server Error"
    });
  }
}