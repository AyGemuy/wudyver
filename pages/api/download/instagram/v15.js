import axios from "axios";
import https from "https";
async function download(link) {
  const cookie = 'wd=600x1153; mid=ZoTOyAALAAEP2pC14FT_nPOKtMgV; ig_did=D5F18322-A0BF-45E1-A66D-ED08BFA5ED3E; datr=yM6EZtQko-OSwboElhfm0T3_; ig_nrcb=1; csrftoken=vis75yhD4PgqjPIIpZ0UjGCYyY9UIInc; ds_user_id=67570554512; sessionid=67570554512%3AFMZLH8xLvehtDc%3A4%3AAYcOUf7mrwlnKR2TNPBcz7po7S487PhuYuNqKJ0GSQ; ps_n=1; ps_l=1; rur="CCO\\05467570554512\\0541751553996:01f744a347539f48ce52b8d5d280fe5fb8afd42bda212c11fdcdfff88ed89f3e1f69eb43"; useragent=TW96aWlsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyNS4wLjAuMCBTYWZhcmkvNTM3LjM2; _uafec=Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F125.0.0.0%20Safari%2F537.36;';

  function formatNumber(number) {
    if (isNaN(number)) {
      return null;
    }
    return number.toLocaleString("de-DE");
  }
  async function getPost(url, cookie) {
    const headers = {
      accept: "*/*",
      "accept-language": "vi,en-US;q=0.9,en;q=0.8",
      "sec-ch-ua": '"Chromium";v="106", "Microsoft Edge";v="106", "Not;A=Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "x-asbd-id": "198387",
      "x-csrftoken": "tJk2tDhaeYfUeJRImgbH75Vp6CV6PjtW",
      "x-ig-app-id": "936619743392459",
      "x-ig-www-claim": "hmac.AR1NFmgjJtkM68KRAAwpbEV2G73bqDP45PvNfY8stbZcFiRA",
      "x-instagram-ajax": "1006400422",
      Referer: "https://www.instagram.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
    if (!url || !url.match(/https:\/\/www\.instagram\.com\/(p|tv|reel)\/[a-zA-Z0-9]+/)) {
      throw new Error("Invalid or missing URL");
    }
    headers.cookie = cookie;
    const {
      data
    } = await axios.get(url, {
      headers: headers
    });
    const postId = data.match(/instagram:\/\/media\?id=(\d+)/)?.[1];
    if (!postId) throw new Error("Post not found");
    const {
      data: postInfo
    } = await axios.get(`https://www.instagram.com/api/v1/media/${postId}/info/`, {
      headers: headers
    });
    delete headers.cookie;
    const info = postInfo.items?.[0] || {};
    const dataReturn = {
      images: [],
      videos: []
    };
    if (info.video_versions) {
      dataReturn.videos = [info.video_versions[info.video_versions.length - 1].url];
    } else {
      const allImage = info.carousel_media || [{
        image_versions2: info.image_versions2
      }];
      dataReturn.images = allImage.map(item => item.image_versions2.candidates[0].url);
    }
    const postData = {
      ...dataReturn,
      caption: info.caption?.text || "",
      owner: {
        id: info.user.pk,
        username: info.user.username,
        full_name: info.user.full_name,
        profile_pic_url: info.user.profile_pic_url
      },
      like_count: info.like_count,
      comment_count: info.comment_count,
      created_at: info.taken_at,
      media_type: info.media_type,
      originalData: info
    };
    const attachments = [];
    if (postData.images && postData.images.length > 0) {
      attachments.push(...postData.images.map(imageUrl => ({
        type: "Photo",
        url: imageUrl
      })));
    } else if (postData.videos && postData.videos.length > 0) {
      attachments.push(...postData.videos.map(videoUrl => ({
        type: "Video",
        url: videoUrl
      })));
    }
    return {
      id: postData.originalData.id,
      message: postData?.caption || null,
      author: postData ? `${postData.owner.full_name} (${postData.owner.username})` : null,
      like: formatNumber(postData?.like_count) || null,
      comment: formatNumber(postData?.comment_count) || null,
      play: formatNumber(postData.originalData.play_count) || null,
      attachments: attachments
    };
  }
  async function getStories(url, cookie) {
    const headers = {
      accept: "*/*",
      "accept-language": "vi,en-US;q=0.9,en;q=0.8",
      "sec-ch-ua": '"Chromium";v="106", "Microsoft Edge";v="106", "Not;A=Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "x-asbd-id": "198387",
      "x-csrftoken": "tJk2tDhaeYfUeJRImgbH75Vp6CV6PjtW",
      "x-ig-app-id": "936619743392459",
      "x-ig-www-claim": "hmac.AR1NFmgjJtkM68KRAAwpbEV2G73bqDP45PvNfY8stbZcFiRA",
      "x-instagram-ajax": "1006400422",
      referer: "https://www.instagram.com/",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-ig-app-id": "936619743392459",
      "x-ig-www-claim": "hmac.AR2zPqOnGfYtujT0tmDsmiq0fdQ3f9DN4xXJ-J3EXnE6vFfA",
      "x-instagram-ajax-c2": "b9a1aaad95e9",
      "x-instagram-ajax-c2-t": "41e3f8b",
      "x-requested-with": "XMLHttpRequest"
    };
    headers.cookie = cookie;
    async function getUserId(username) {
      const userRes = await axios.get(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
        headers: headers
      });
      return userRes.data.data.user.id;
    }
    const username = url.match(/instagram\.com\/stories\/([^/]+)\//)?.[1] || null;
    const userId = await getUserId(username);
    const getId = url.match(/\/stories\/[^\/]+\/(\d+)/)?.[1] || null;
    const storiesRes = await axios.get(`https://www.instagram.com/graphql/query/?query_hash=de8017ee0a7c9c45ec4260733d81ea31&variables={"reel_ids":["${userId}"],"tag_names":[],"location_ids":[],"highlight_reel_ids":[],"precomposed_overlay":false,"show_story_viewer_list":true}`, {
      headers: headers
    });
    delete headers.cookie;
    const data = storiesRes.data.data.reels_media[0].items;
    const res = data.find(item => item.id === getId);
    let attachments = [];
    if (res.video_resources && res.video_resources.length > 0) {
      attachments.push({
        type: "Video",
        url: res.video_resources[0].src
      });
    } else if (res.display_resources && res.display_resources.length > 0) {
      attachments.push({
        type: "Photo",
        url: res.display_resources[0].src
      });
    }
    return {
      id: res.id,
      message: null,
      author: null,
      like: null,
      comment: null,
      play: null,
      attachments: attachments
    };
  }
  async function getHighlight(url, cookie) {
    try {
      const headers = {
        accept: "*/*",
        "accept-language": "vi,en-US;q=0.9,en;q=0.8",
        "sec-ch-ua": '"Chromium";v="106", "Microsoft Edge";v="106", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-asbd-id": "198387",
        "x-csrftoken": "tJk2tDhaeYfUeJRImgbH75Vp6CV6PjtW",
        "x-ig-app-id": "936619743392459",
        "x-ig-www-claim": "hmac.AR1NFmgjJtkM68KRAAwpbEV2G73bqDP45PvNfY8stbZcFiRA",
        "x-instagram-ajax": "1006400422",
        referer: "https://www.instagram.com/",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-ig-app-id": "936619743392459",
        "x-ig-www-claim": "hmac.AR2zPqOnGfYtujT0tmDsmiq0fdQ3f9DN4xXJ-J3EXnE6vFfA",
        "x-instagram-ajax-c2": "b9a1aaad95e9",
        "x-instagram-ajax-c2-t": "41e3f8b",
        "x-requested-with": "XMLHttpRequest"
      };
      const storyId = url.match(/story_media_id=([^&]+)/)?.[1];
      headers.cookie = cookie;
      const res = await axios.get(`https://i.instagram.com/api/v1/media/${storyId}/info/`, {
        headers: headers
      });
      delete headers.cookie;
      const data = res.data.items;
      const resp = data.find(item => item.id === storyId);
      let attachments = [];
      if (resp.video_versions && resp.video_versions.length > 0) {
        attachments.push({
          type: "Video",
          url: resp.video_versions[0].url
        });
      } else if (resp.image_versions2 && resp.image_versions2.candidates && resp.image_versions2.candidates.length > 0) {
        attachments.push({
          type: "Photo",
          url: resp.image_versions2.candidates[0].url
        });
      }
      return {
        id: resp.id,
        message: resp.caption,
        author: `${resp.user.full_name} (${resp.user.username})`,
        like: null,
        comment: null,
        play: null,
        attachments: attachments
      };
    } catch (error) {
      console.error(error);
    }
  }
  if (/https:\/\/www\.instagram\.com\/(p|tv|reel)\/[a-zA-Z0-9]+/.test(link)) {
    const data = await getPost(link, cookie);
    return data;
  } else if (/https:\/\/www\.instagram\.com\/stories\/[\w.]+\/\d+(\?[^\s]*)?/.test(link)) {
    const data = await getStories(link, cookie);
    return data;
  } else {
    const data = await getHighlight(link, cookie);
    return data;
  }
}
async function post(username) {
  try {
    const BASE_URL = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    const {
      data
    } = await axios({
      url: BASE_URL,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.55",
        accept: "*/*",
        "accept-language": "vi,en-US;q=0.9,en;q=0.8",
        "sec-ch-ua": '"Chromium";v="106", "Microsoft Edge";v="106", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-asbd-id": "198387",
        "x-csrftoken": "94HUiQIoRE8XEAkiGN3oEHSVLEDpzlnM",
        "x-ig-app-id": "936619743392459",
        "x-ig-www-claim": "hmac.AR3OQ0qbMQFGvopKt6bvf27cwSi_srYglMRalVX8pFRJNKXt",
        "x-requested-with": "XMLHttpRequest",
        cookie: "ig_nrcb=1; csrftoken=94HUiQIoRE8XEAkiGN3oEHSVLEDpzlnM; mid=Y8jaNwALAAFAtVwK0OuIkT_IkUvJ; ig_did=AFDB5466-11F2-4B70-8806-94F872304DA0; datr=7trIY6-UmELSkqqrYsxkK5Pg",
        Referer: "https://www.instagram.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      httpsAgent: https.Agent({
        keepAlive: true
      }),
      method: "GET"
    });
    const user = data.data.user;
    return {
      edge_owner_to_timeline_media: user.edge_owner_to_timeline_media,
      edge_felix_video_timeline: user.edge_felix_video_timeline
    };
  } catch (e) {
    console.log(e);
    throw e.response.data;
  }
}
async function info(username) {
  try {
    const userAgents = ["Mozilla/5.0 (Linux; Android 12; F-51B Build/V47RD64B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Ve\tAndroid rsion/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 265.0.0.19.301 Android (31/12; 360dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 436384443)", "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 265.0.0.19.301 Android (31/13; 320dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 436384443)", "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 265.0.0.19.301 Android (31/12; 320dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 436384443)", "Instagram 264.0.0.22.106 Android (28/9; 160dpi; 800x1232; JOYAR/onn; TBBVNC100005208; TBBVNC100005208; mt8163; en_US; 430370697)\tAndroid\tONN TBBVNC100005208", "Mozilla/5.0 (Linux; Android 9; KFONWI Build/PS7326.3183N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.170 Safari/537.36 Instagram 253.0.0.23.114 Android (28/9; 213dpi; 800x1216; Amazon; KFONWI; onyx; mt8168; de_DE; 399993134)", "Mozilla/5.0 (Linux; Android 9; KFONWI Build/PS7326.3183N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.170 Safari/537.36 Instagram 253.0.0.23.114 Android (28/9; 213dpi; 800x1216; Amazon; KFONWI; onyx; mt8168; en_GB; 399993134)9\tExplay Onyx", "Mozilla/5.0 (Linux; Android 12; F-51B Build/V47RD64B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 265.0.0.19.301 Android (31/12; 320dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 436384443)12\tFujitsu Arrows We", "Instagram 261.0.0.21.111 Android (30/11; 540dpi; 1080x2137; HMD Global/Nokia; Nokia X100; DM5; qcom; es_US; 418951310)\tAndroid\tNokia Nokia X100", "Mozilla/5.0 (Linux; Android 9; KFONWI Build/PS7326.3183N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.170 Safari/537.36 Instagram 264.0.0.22.106 Android (28/9; 213dpi; 800x1216; Amazon; KFONWI; onyx; mt8168; de_DE; 430370685)9\tExplay Onyx", "Mozilla/5.0 (Linux; Android 12; FCG01 Build/V40RK64A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 264.0.0.22.106 Android (31/12; 360dpi; 720x1366; FCNT; FCG01; FCG01; qcom; ja_JP; 430370701)12\tFujitsu Arrows We", "Mozilla/5.0 (Linux; Android 9; KFONWI Build/PS7326.3183N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.170 Safari/537.36 Instagram 224.2.0.20.116 Android (28/9; 213dpi; 800x1216; Amazon; KFONWI; onyx; mt8168; en_US; 354065894)9\tExplay Onyx", "Instagram 145.0.0.32.119 Android (29/10; 480dpi; 1080x2264; Realme; RMX1851; RMX1851; qcom; en_US; 219308759)\tAndroid\tRealme 3 Pro", "Mozilla/5.0 (Linux; Android 9; 7DY Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Safari/537.36 Instagram 264.0.0.22.106 Android (28/9; 160dpi; 600x976; mediacom; 7DY; 7DY; mt8321; it_IT; 430370684)9\tMediacom 7DY", "Mozilla/5.0 (Linux; Android 9; 1CY Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Safari/537.36 Instagram 264.0.0.22.106 Android (28/9; 160dpi; 800x1232; mediacom; 1CY; 1CY; mt8321; it_IT; 430370684)9\tMediacom 1CY", "Mozilla/5.0 (Linux; Android 12; F-51B Build/V47RD64B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 264.0.0.22.106 Android (31/12; 320dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 430370627)12\tFujitsu Arrows We", "Mozilla/5.0 (Linux; Android 5.1; B1-723 Build/LMY47I; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Safari/537.36 Instagram 264.0.0.22.106 Android (22/5.1; 160dpi; 600x976; Acer/acer; B1-723; oban; mt6580; it_IT; 430370684)5\tAcer Iconia Talk 7", "Mozilla/5.0 (Linux; Android 11; FCG01 Build/V14RK61D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 264.0.0.22.106 Android (30/11; 320dpi; 720x1366; FCNT; FCG01; FCG01; qcom; ja_JP; 430370701)11\tFujitsu Arrows We", "Mozilla/5.0 (Linux; Android 9; 7DY Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Safari/537.36 Instagram 263.2.0.19.104 Android (28/9; 160dpi; 600x976; mediacom; 7DY; 7DY; mt8321; it_IT; 428413120)9\tMediacom 7DY", "Mozilla/5.0 (Linux; Android 12; F-51B Build/V47RD64B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Instagram 264.0.0.22.106 Android (31/12; 320dpi; 720x1366; FCNT; F-51B; F51B; qcom; ja_JP; 430370703)12\tFujitsu Arrows We", "Mozilla/5.0 (Linux; Android 9; KFONWI Build/PS7326.3183N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.170 Safari/537.36 Instagram 253.0.0.23.114 Android (28/9; 213dpi; 800x1216; Amazon; KFONWI; onyx; mt8168; en_CA; 399993134)"];
    const BASE_URL = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    const headers = {
      "user-agent": userAgents[Math.floor(Math.random() * userAgents.length)],
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "vi,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
      "cache-control": "max-age=0",
      "sec-ch-prefers-color-scheme": "dark",
      "sec-ch-ua": '"Not_A Brand";v="99", "Microsoft Edge";v="109", "Chromium";v="109"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie: "csrftoken=MmWyMFr7j6h05DE0ZIhbHVGvmKIBwsn1; mid=Y8jCyAALAAGuxvSb_XxKIqDPDRTA; ig_did=46113657-2712-42E0-AB3A-9FAF79C51B8C; ig_nrcb=1"
    };
    const response = await axios.get(BASE_URL, {
      headers: headers
    });
    const {
      data
    } = response;
    return data;
  } catch (e) {
    console.log(e);
    throw {
      error: "INVALID_USERNAME",
      message: "Invalid username"
    };
  }
}
export default async function handler(req, res) {
  const {
    url,
    username,
    type = "download"
  } = req.query;
  try {
    let result;
    switch (type) {
      case "download":
        if (!url) return res.status(400).json({
          error: "URL is required for download"
        });
        result = await download(url);
        break;
      case "info":
        if (!username) return res.status(400).json({
          error: "username is required for info"
        });
        result = await info(username);
        break;
      case "post":
        if (!username) return res.status(400).json({
          error: "username is required for post"
        });
        result = await post(username);
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