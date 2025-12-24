import axios from "axios";
export default async function handler(req, res) {
  const tikTokUserIds = ["6966254204646441989", "7093800451225322502", "6572773017842352130", "6880529154954068998", "6958125517749896198", "7086868979805766658", "7403912348879504389", "6806145845533344769", "7108701608724513798", "7010288109087523845", "6822271197663036422"];
  try {
    const videos = await fetchTikTokUsersVideos(tikTokUserIds);
    if (!videos || videos.length === 0) {
      return res.status(404).json({
        error: "No anime videos found."
      });
    }
    const randomVideo = videos[Math.floor(Math.random() * videos.length)];
    const importantDetails = {
      author: "AceGerome",
      videoId: randomVideo.video_id,
      title: randomVideo.title,
      cover: randomVideo.cover,
      playUrl: randomVideo.play,
      user: {
        nickname: randomVideo.author.nickname,
        avatar: randomVideo.author.avatar
      },
      playCount: randomVideo.play_count,
      diggCount: randomVideo.digg_count,
      commentCount: randomVideo.comment_count,
      shareCount: randomVideo.share_count,
      downloadCount: randomVideo.download_count
    };
    return res.json(importantDetails);
  } catch (error) {
    console.error("Error fetching anime video:", error);
    return res.status(500).json({
      error: "An error occurred while fetching anime videos."
    });
  }
}
async function fetchTikTokUsersVideos(userIds) {
  const allVideos = [];
  for (const userId of userIds) {
    const videos = await fetchTikTokUserVideos(userId);
    if (videos) {
      allVideos.push(...videos);
    }
  }
  return allVideos;
}
async function fetchTikTokUserVideos(userId) {
  const options = {
    method: "GET",
    url: "https://tiktok-scraper7.p.rapidapi.com/user/posts",
    params: {
      user_id: userId,
      count: "300"
    },
    headers: {
      "X-RapidAPI-Key": "19dcd320d3msh7d026f853e55094p16723cjsn3b381f924650",
      "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com"
    }
  };
  try {
    const response = await axios.request(options);
    return response.data.data.videos || [];
  } catch (error) {
    console.error(`Error fetching videos for user ${userId}:`, error);
    return [];
  }
}