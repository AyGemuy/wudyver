import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "Username tidak disediakan."
    });
  }
  try {
    const {
      data
    } = await axios.get(`https://www.idn.app/${username}`);
    const $ = cheerio.load(data);
    const jsonData = JSON.parse($("#__NEXT_DATA__").html());
    const profile = jsonData?.props?.pageProps?.profile || {};
    const livestreams = jsonData?.props?.pageProps?.livestreams || [];
    const result = {
      name: profile?.name || "Tidak tersedia",
      username: profile?.username || "Tidak tersedia",
      bioDescription: profile?.bio_description || "tidak memiliki bio",
      avatar: profile?.avatar || "https://via.placeholder.com/150",
      followingCount: profile?.following_count ?? 0,
      followerCount: profile?.follower_count ?? 0,
      livestreams: livestreams.length > 0 ? livestreams.map(stream => ({
        title: stream?.title || "Tidak tersedia",
        imageUrl: stream?.image_url || "https://via.placeholder.com/150",
        category: stream?.category?.name || "Tidak tersedia",
        viewCount: stream?.view_count ?? 0,
        playbackUrl: stream?.playback_url || "Tidak tersedia",
        status: stream?.status || "Tidak tersedia"
      })) : "tidak ada"
    };
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan pada server.",
      details: error.message
    });
  }
}