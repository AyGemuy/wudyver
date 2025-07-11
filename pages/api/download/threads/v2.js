import axios from "axios";
import * as cheerio from "cheerio";
async function downloadv1(link) {
  function getIDThread(link) {
    const regex = /\/post\/([^\/]+)\/?/;
    const match = link.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }
  const id = getIDThread(link);
  try {
    const response = await axios.get(`https://data.threadster.site/results/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive"
      }
    });
    const data = response.data.data;
    const results = [];
    if (data.media && data.media.length > 0) {
      data.media.forEach(media => {
        if (media.image_url) {
          results.push({
            type: "image",
            url: media.image_url
          });
        } else if (media.video_url) {
          results.push({
            type: "video",
            url: media.video_url
          });
        }
      });
    }
    const title = data.full_text;
    const user = {
      username: data.user.username,
      profile_pic_url: data.user.profile_pic_url
    };
    return {
      title: title,
      user: user,
      results: results
    };
  } catch (error) {
    throw new Error("Error fetching data:", error);
  }
}
async function downloadv2(url) {
  function formatNumber(number) {
    if (isNaN(number)) {
      return null;
    }
    return number.toLocaleString("de-DE");
  }
  try {
    const res = await axios.get(url, {
      headers: {
        authority: "www.threads.net",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      }
    });
    if (res.status !== 200) {
      throw new Error(`Status Error: ${res.status} ${res.config.url}`);
    }
    const content = res.data;
    const $ = cheerio.load(content);
    const scripts = $("script");
    let scriptContent;
    scripts.each((i, script) => {
      if (script.children[0] && script.children[0].data.includes("username") && script.children[0].data.includes("original_width")) {
        scriptContent = script.children[0].data;
        return false;
      }
    });
    const parsedData = JSON.parse(scriptContent);
    const result = parsedData.require[0][3][0].__bbox.require[0][3][1].__bbox.result;
    const dataResponse = result.data.data.edges[0].node.thread_items[0].post;
    const attachments = [];
    if (dataResponse.video_versions && dataResponse.video_versions.length > 0) {
      attachments.push({
        type: "Video",
        url: dataResponse.video_versions[0].url
      });
    }
    if (dataResponse.carousel_media && dataResponse.carousel_media.length > 0) {
      const photos = [];
      const videos = [];
      dataResponse.carousel_media.forEach(item => {
        if (item.image_versions2 && item.image_versions2.candidates && item.image_versions2.candidates.length > 0) {
          photos.push({
            type: "Photo",
            url: item.image_versions2.candidates[0].url
          });
        }
        if (item.video_versions && item.video_versions.length > 0) {
          videos.push({
            type: "Video",
            url: item.video_versions[0].url
          });
        }
      });
      attachments.push(...photos, ...videos);
    }
    if (dataResponse.audio && dataResponse.audio.audio_src) {
      attachments.push({
        type: "Audio",
        url: dataResponse.audio.audio_src
      });
    }
    return {
      id: dataResponse.pk,
      message: dataResponse.caption.text || "Không có tiêu đề",
      like_count: formatNumber(dataResponse.like_count) || 0,
      reply_count: formatNumber(dataResponse.text_post_app_info.direct_reply_count) || 0,
      repost_count: formatNumber(dataResponse.text_post_app_info.repost_count) || 0,
      quote_count: formatNumber(dataResponse.text_post_app_info.quote_count) || 0,
      author: dataResponse.user.username,
      short_code: dataResponse.code,
      taken_at: dataResponse.taken_at,
      attachments: attachments
    };
  } catch (error) {
    console.error(error);
  }
}
export default async function handler(req, res) {
  const {
    url,
    type = "v1"
  } = req.query;
  try {
    let result;
    switch (type) {
      case "v1":
        if (!url) return res.status(400).json({
          error: "URL is required for downloadv1"
        });
        result = await downloadv1(url);
        break;
      case "v2":
        if (!url) return res.status(400).json({
          error: "URL is required for downloadv2"
        });
        result = await downloadv2(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid type"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}