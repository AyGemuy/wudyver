import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class CosxplayScraper {
  constructor() {
    this.proxyBaseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v14?url=`;
  }
  async search({
    query
  }) {
    const encodedSearchTerm = encodeURIComponent(query);
    const targetUrl = `https://cosxplay.com/?s=${encodedSearchTerm}`;
    const proxyRequestUrl = `${this.proxyBaseUrl}${encodeURIComponent(targetUrl)}`;
    const headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36"
    };
    try {
      const response = await axios.get(proxyRequestUrl, {
        headers: headers
      });
      const htmlContent = response.data;
      const $ = cheerio.load(htmlContent);
      const videos = $("div.video-block.video-with-trailer").map((index, el) => {
        const videoElement = $(el);
        const linkElement = videoElement.find("a.thumb.ppopp");
        const imgElement = videoElement.find("a.thumb.ppopp img.video-img").first();
        const infosElement = videoElement.find("a.infos.ppopp");
        const getTextFromInfo = selector => {
          const foundElement = infosElement.find(selector);
          return foundElement.length ? foundElement.clone().children().remove().end().text().trim() : null;
        };
        return {
          postId: videoElement.attr("data-post-id") || null,
          trailerUrl: videoElement.attr("data-trailer-url") || null,
          link: linkElement.attr("href") || null,
          imageUrl: imgElement.attr("data-src") || imgElement.attr("src") || null,
          title: infosElement.find(".title").text().trim() || null,
          views: getTextFromInfo(".views-number"),
          rating: getTextFromInfo(".rating"),
          duration: getTextFromInfo(".duration.notranslate")
        };
      }).get();
      return videos;
    } catch (error) {
      console.error("Gagal melakukan scraping melalui proxy (search):", error.message);
      if (error.response) {
        console.error("Proxy Response Status:", error.response.status);
      }
      return [];
    }
  }
  async detail({
    url
  }) {
    const proxyRequestUrl = `${this.proxyBaseUrl}${encodeURIComponent(url)}`;
    const headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36"
    };
    try {
      const response = await axios.get(proxyRequestUrl, {
        headers: headers
      });
      const htmlContent = response.data;
      const $ = cheerio.load(htmlContent);
      let videoInfo = {
        title: null,
        description: null,
        duration: null,
        uploadDate: null,
        thumbnailUrl: null,
        embedUrl: null,
        keywords: null,
        views: null,
        likes: null,
        comments: null,
        viewsFormatted: null,
        likesPercentage: null,
        dislikesPercentage: null,
        commentsCount: null,
        durationFormatted: null,
        posterUrl: null
      };
      let downloadLinks = {};
      let relatedVideos = [];
      let tags = [];
      let categories = [];
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      if (jsonLdScript) {
        try {
          let jsonData = JSON.parse(jsonLdScript);
          const videoObject = Array.isArray(jsonData) ? jsonData.find(item => item && item["@type"] === "VideoObject") : jsonData && jsonData["@type"] === "VideoObject" ? jsonData : null;
          if (videoObject) {
            videoInfo.title = videoObject.name || videoInfo.title;
            videoInfo.description = videoObject.description || videoInfo.description;
            videoInfo.duration = videoObject.duration || videoInfo.duration;
            videoInfo.uploadDate = videoObject.uploadDate || videoInfo.uploadDate;
            videoInfo.thumbnailUrl = videoObject.thumbnailUrl || videoInfo.thumbnailUrl;
            if (Array.isArray(videoInfo.thumbnailUrl) && videoInfo.thumbnailUrl.length > 0) {
              videoInfo.thumbnailUrl = videoInfo.thumbnailUrl[0];
            }
            videoInfo.embedUrl = videoObject.embedUrl || videoInfo.embedUrl;
            videoInfo.keywords = videoObject.keywords || videoInfo.keywords;
            if (Array.isArray(videoInfo.keywords)) {
              videoInfo.keywords = videoInfo.keywords.join(", ");
            }
            if (videoObject.interactionStatistic) {
              const findStat = type => videoObject.interactionStatistic.find(stat => stat && (stat.interactionType === type || stat.interactionType === `http://schema.org/${type}`));
              const watchAction = findStat("WatchAction");
              const likeAction = findStat("LikeAction");
              const commentAction = findStat("CommentAction");
              if (watchAction && watchAction.userInteractionCount) {
                videoInfo.views = parseInt(watchAction.userInteractionCount) || videoInfo.views;
              }
              if (likeAction && likeAction.userInteractionCount) {
                videoInfo.likes = parseInt(likeAction.userInteractionCount) || videoInfo.likes;
              }
              if (commentAction && commentAction.userInteractionCount) {
                videoInfo.comments = parseInt(commentAction.userInteractionCount) || videoInfo.comments;
              }
            }
          }
        } catch (e) {
          console.error("Gagal parsing JSON-LD:", e.message);
        }
      }
      if (!videoInfo.title) {
        videoInfo.title = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || $("title").first().text().trim() || $(".entry-title").first().text().trim() || $('h1[itemprop="name"]').first().text().trim() || $("h1").first().text().trim();
      }
      if (!videoInfo.description) {
        videoInfo.description = $('meta[property="og:description"]').attr("content") || $('meta[name="twitter:description"]').attr("content") || $('meta[name="description"]').attr("content") || $(".video-description").first().text().trim() || $('div[itemprop="description"]').first().text().trim();
      }
      if (!videoInfo.thumbnailUrl) {
        videoInfo.thumbnailUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || $('link[rel="image_src"]').attr("href");
      }
      if (!videoInfo.keywords) {
        const metaKeywords = $('meta[name="keywords"]').attr("content") || $('meta[itemprop="keywords"]').attr("content");
        if (metaKeywords) {
          videoInfo.keywords = metaKeywords.split(",").map(k => k.trim()).filter(Boolean).join(", ");
        }
      }
      if (!videoInfo.uploadDate) {
        videoInfo.uploadDate = $('meta[property="article:published_time"]').attr("content") || $('meta[name="dcterms.date"]').attr("content") || $('meta[itemprop="uploadDate"]').attr("content") || $(".entry-date.published").first().attr("datetime") || $(".date.published").first().text().trim();
      }
      const viewsElement = $(".vid-views .vid-up").first();
      if (viewsElement.length) {
        videoInfo.viewsFormatted = viewsElement.text().trim();
        if (videoInfo.views === null && videoInfo.viewsFormatted) {
          const viewsMatch = videoInfo.viewsFormatted.replace(/[,.]/g, "").match(/\d+/);
          if (viewsMatch) videoInfo.views = parseInt(viewsMatch[0]);
        }
      }
      const likesElement = $(".vid-likes .likes_count").first();
      if (likesElement.length) {
        videoInfo.likesPercentage = likesElement.text().trim();
        if (videoInfo.likes === null && videoInfo.likesPercentage && !videoInfo.likesPercentage.includes("%")) {
          const likesMatch = videoInfo.likesPercentage.replace(/[,.]/g, "").match(/\d+/);
          if (likesMatch) videoInfo.likes = parseInt(likesMatch[0]);
        }
      }
      const dislikesElement = $(".vid-likes .dislikes_count").first();
      if (dislikesElement.length) {
        videoInfo.dislikesPercentage = dislikesElement.text().trim();
      }
      const commentsElement = $(".vid-comments .co-number").first();
      if (commentsElement.length) {
        videoInfo.commentsCount = commentsElement.text().trim();
        if (videoInfo.comments === null && videoInfo.commentsCount) {
          const commentsMatch = videoInfo.commentsCount.replace(/[,.]/g, "").match(/\d+/);
          if (commentsMatch) videoInfo.comments = parseInt(commentsMatch[0]);
        }
      }
      const timeElement = $(".xp-Player-time").first();
      if (timeElement.length) {
        videoInfo.durationFormatted = timeElement.text().trim();
        if (!videoInfo.duration) {
          videoInfo.duration = videoInfo.durationFormatted;
        }
      }
      const posterStyle = $(".xp-Player-poster").attr("style");
      if (posterStyle) {
        const posterMatch = posterStyle.match(/url\("([^"]+)"\)/);
        if (posterMatch && posterMatch[1]) {
          videoInfo.posterUrl = posterMatch[1];
          if (!videoInfo.thumbnailUrl) videoInfo.thumbnailUrl = videoInfo.posterUrl;
        }
      }
      $("a.label-cat-video.ppopp").each((index, el) => {
        const catEl = $(el);
        categories.push({
          name: catEl.text().trim(),
          url: catEl.attr("href"),
          title: catEl.attr("title")
        });
      });
      $("a.label-tag-video.ppopp").each((index, el) => {
        const tagEl = $(el);
        const tagName = tagEl.text().trim();
        const tagUrl = tagEl.attr("href");
        if (tagName) {
          tags.push({
            name: tagName,
            url: tagUrl,
            title: tagEl.attr("title") || tagName
          });
          let currentKeywords = videoInfo.keywords ? videoInfo.keywords.toLowerCase().split(",").map(k => k.trim()) : [];
          if (!currentKeywords.includes(tagName.toLowerCase())) {
            videoInfo.keywords = videoInfo.keywords ? `${videoInfo.keywords}, ${tagName}` : tagName;
          }
        }
      });
      $("video.xp-Player-video source").each((index, el) => {
        const sourceEl = $(el);
        const src = sourceEl.attr("src");
        let quality = sourceEl.attr("title");
        if (src) {
          if (!quality) {
            if (src.includes("720")) quality = "720p";
            else if (src.includes("1080")) quality = "1080p";
            else if (src.includes("480")) quality = "480p";
            else if (src.includes("360")) quality = "360p";
            else quality = "unknown";
          }
          downloadLinks[quality.toLowerCase().replace(/\s+/g, "")] = src;
        }
      });
      $(".related-videos .video-block.video-with-trailer").each((index, el) => {
        const vidEl = $(el);
        const linkEl = vidEl.find("a.thumb.ppopp");
        const imgEl = vidEl.find("img.video-img");
        const titleEl = vidEl.find(".title");
        if (linkEl.length && titleEl.length) {
          relatedVideos.push({
            title: titleEl.text().trim(),
            link: linkEl.attr("href"),
            thumb: imgEl.attr("data-src") || imgEl.attr("src"),
            duration: vidEl.find(".duration.notranslate").text().trim(),
            views: vidEl.find(".views-number").text().trim(),
            rating: vidEl.find(".rating").text().trim(),
            postId: vidEl.attr("data-post-id"),
            trailerUrl: vidEl.attr("data-trailer-url")
          });
        }
      });
      if (!videoInfo.title || Object.keys(downloadLinks).length === 0) {
        const toStoreStartMarker = "const toStore = ";
        const toStoreStartIndex = htmlContent.indexOf(toStoreStartMarker);
        if (toStoreStartIndex !== -1) {
          const relevantSubstring = htmlContent.substring(toStoreStartIndex);
          const toStoreRegex = /^const toStore = (\{[\s\S]*?\});/;
          const toStoreMatch = relevantSubstring.match(toStoreRegex);
          if (toStoreMatch && toStoreMatch[1]) {
            let storeString = toStoreMatch[1];
            storeString = storeString.replace(/new Date\(\)/g, "null").replace(/(['"])?moment\((.*?)\)(['"])?/g, "null");
            try {
              const storeData = JSON.parse(storeString);
              videoInfo.title = videoInfo.title || storeData.video_title || storeData.title || null;
              videoInfo.description = videoInfo.description || storeData.video_description || storeData.description || null;
              if (videoInfo.views === null && storeData.views_count) videoInfo.views = parseInt(storeData.views_count);
              videoInfo.uploadDate = videoInfo.uploadDate || storeData.upload_date || null;
              if (storeData.video_files && Object.keys(downloadLinks).length === 0) {
                for (const quality in storeData.video_files) {
                  if (storeData.video_files[quality]) {
                    downloadLinks[quality.toLowerCase()] = storeData.video_files[quality];
                  }
                }
              }
              const storeThumbnail = storeData.video_thumb || storeData.poster;
              if (!videoInfo.thumbnailUrl && storeThumbnail) videoInfo.thumbnailUrl = storeThumbnail;
              if (!videoInfo.posterUrl && storeThumbnail) videoInfo.posterUrl = storeThumbnail;
            } catch (e) {
              console.error("Gagal mem-parsing data toStore:", e.message);
            }
          }
        }
      }
      if (Object.keys(downloadLinks).length === 0) {
        let playerScriptContent = null;
        $("script").each((i, scriptTag) => {
          const scriptText = $(scriptTag).html();
          if (scriptText && (scriptText.includes("var videoHigh =") || scriptText.includes("videoHigh = ") || scriptText.includes("video_source_url_high"))) {
            playerScriptContent = scriptText;
            return false;
          }
        });
        if (playerScriptContent) {
          const extractVar = regex => {
            const match = playerScriptContent.match(regex);
            return match && match[1] ? match[1] : null;
          };
          const qualities = ["high", "low", "normal", "sd", "hd"];
          qualities.forEach(q => {
            if (!downloadLinks[q]) {
              const link = extractVar(new RegExp(`(?:var\\s+)?(?:video${q.charAt(0).toUpperCase() + q.slice(1)}|video_source_url_${q})\\s*=\\s*"([^"]+)"`));
              if (link) downloadLinks[q] = link;
            }
          });
          Object.keys(downloadLinks).forEach(key => {
            if (!downloadLinks[key]) delete downloadLinks[key];
          });
          if (!videoInfo.posterUrl) {
            const posterFromScript = extractVar(/(?:var\s+)?poster\s*=\s*"([^"]+)"/);
            if (posterFromScript) {
              videoInfo.posterUrl = posterFromScript;
              if (!videoInfo.thumbnailUrl) videoInfo.thumbnailUrl = posterFromScript;
            }
          }
        }
      }
      const defaultVideoInfoKeys = {
        title: null,
        description: null,
        duration: null,
        uploadDate: null,
        thumbnailUrl: null,
        embedUrl: null,
        keywords: null,
        views: null,
        likes: null,
        comments: null,
        viewsFormatted: null,
        likesPercentage: null,
        dislikesPercentage: null,
        commentsCount: null,
        durationFormatted: null,
        posterUrl: null
      };
      videoInfo = {
        ...defaultVideoInfoKeys,
        ...videoInfo
      };
      return {
        info: videoInfo,
        download: downloadLinks,
        related: relatedVideos,
        categories: categories,
        tags: tags
      };
    } catch (error) {
      console.error(`Gagal mengambil detail dari ${url}:`, error.message);
      if (error.response) {
        console.error("Proxy Response Status (detail):", error.response.status);
      }
      const defaultVideoInfoOnError = {
        title: null,
        description: null,
        duration: null,
        uploadDate: null,
        thumbnailUrl: null,
        embedUrl: null,
        keywords: null,
        views: null,
        likes: null,
        comments: null,
        viewsFormatted: null,
        likesPercentage: null,
        dislikesPercentage: null,
        commentsCount: null,
        durationFormatted: null,
        posterUrl: null
      };
      return {
        videoInfo: defaultVideoInfoOnError,
        downloadLinks: {},
        relatedVideos: [],
        categories: [],
        tags: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required"
    });
  }
  try {
    const downloader = new CosxplayScraper();
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Query is required for search"
          });
        }
        result = await downloader.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "URL is required for detail"
          });
        }
        result = await downloader.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}