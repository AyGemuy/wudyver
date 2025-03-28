import axios from "axios";
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "Etdaahhh, mana username twitter nya! mada iya mau ngecek kagak ada username nya 🗿"
    });
  }
  const url = `https://taishin-miyamoto.com/ShadowBan/API/JSON?screen_name=${username}`;
  const headers = {
    referer: "https://taishin-miyamoto.com/ShadowBan/",
    "user-agent": "Postify/1.0.0"
  };
  try {
    const {
      data
    } = await axios.get(url, {
      headers: headers,
      timeout: 1e4
    });
    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({
        error: "Kagak ada datanya .. check yang lain aja dahh 😶"
      });
    }
    return res.status(200).json({
      userInfo: {
        id: data.user.id,
        name: data.user.name,
        screenName: data.user.screen_name,
        followersCount: data.user.followers_count,
        friendsCount: data.user.friends_count,
        profileImageUrl: data.user.profile_image_url_https
      },
      shadowBanInfo: {
        unfollowed: data.Unfollowed,
        ghostBan: data.ghost_ban,
        noTweet: data.no_tweet,
        notFound: data.not_found,
        protect: data.protect,
        replyDeboosting: data.reply_deboosting,
        searchBan: data.search_ban,
        searchSuggestionBan: data.search_suggestion_ban,
        suspend: data.suspend
      }
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}