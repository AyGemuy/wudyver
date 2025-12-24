import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Tiktok {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
    this.baseUrl = "https://tikwm.com";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: "current_language=en",
      "User -Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    };
  }
  async download(url) {
    if (!url) throw new Error("URL is required for download.");
    const response = await this.client({
      method: "POST",
      url: this.baseUrl + "/api/",
      headers: this.headers,
      data: {
        url: url,
        hd: 1
      }
    });
    const {
      data
    } = response.data;
    return {
      status: true,
      data: {
        id: data.id,
        title: data.title,
        cover: data.cover,
        media: data.duration === 0 ? {
          type: "image",
          images: data.images,
          image_count: data.images.length
        } : {
          type: "video",
          duration: data.duration,
          nowatermark: {
            size: data.size,
            play: data.play,
            hd: {
              size: data.hd_size,
              play: data.hdplay
            }
          },
          watermark: {
            size: data.wm_size,
            play: data.wmplay
          }
        },
        creation: data.create_time,
        views_count: data.play_count,
        like_count: data.digg_count,
        comment_count: data.comment_count,
        share_count: data.share_count,
        favorite_count: data.collect_count,
        author: data.author,
        music: data.music_info
      }
    };
  }
  async search(query) {
    if (!query) throw new Error("Query is required for search.");
    const response = await this.client({
      method: "POST",
      url: this.baseUrl + "/api/feed/search/",
      headers: this.headers,
      data: {
        keywords: query,
        count: 20,
        cursor: 0,
        hd: 1
      }
    });
    const {
      videos
    } = response.data.data;
    if (videos.length === 0) throw new Error("No results found.");
    return {
      status: true,
      data: videos.map(item => ({
        id: item.video_id,
        title: item.title,
        cover: item.cover,
        media: {
          type: "video",
          duration: item.duration,
          nowatermark: item.play,
          watermark: item.wmplay
        },
        creation: item.create_time,
        views_count: item.play_count,
        like_count: item.digg_count,
        comment_count: item.comment_count,
        share_count: item.share_count,
        author: item.author,
        music: item.music_info
      }))
    };
  }
  async trending(region) {
    if (!region) throw new Error("Region is required for trending.");
    const response = await this.client({
      method: "POST",
      url: this.baseUrl + "/api/feed/list/",
      headers: this.headers,
      data: {
        region: region,
        count: 12,
        cursor: 0,
        web: 1,
        hd: 1
      }
    });
    const data = response.data.data;
    return {
      status: true,
      data: data.map(item => ({
        id: item.video_id,
        title: item.title,
        cover: this.baseUrl + item.cover,
        media: {
          type: "video",
          duration: item.duration,
          nowatermark: this.baseUrl + item.play,
          watermark: item.wmplay
        },
        creation: item.create_time,
        views_count: item.play_count,
        like_count: item.digg_count,
        comment_count: item.comment_count,
        share_count: item.share_count,
        author: {
          id: item.author.id,
          unique_id: item.author.unique_id,
          nickname: item.author.nickname,
          avatar: this.baseUrl + item.author.avatar
        },
        music: item.music_info
      }))
    };
  }
}
export default async function handler(req, res) {
  const tiktok = new Tiktok();
  try {
    const {
      action,
      url,
      query,
      region
    } = req.body;
    let result;
    switch (action) {
      case "download":
        result = await tiktok.download(url);
        break;
      case "search":
        result = await tiktok.search(query);
        break;
      case "trending":
        result = await tiktok.trending(region);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Invalid action."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
}