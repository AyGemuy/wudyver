import axios from "axios";
import * as cheerio from "cheerio";
class AnimeIndo {
  constructor(baseUrl = "https://anime-indo.lol") {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
  }
  async search(query = "") {
    if (!query || query.trim() === "") {
      return [];
    }
    const url = `${this.baseUrl}/search/${encodeURIComponent(query.trim())}/`;
    const {
      data
    } = await this.client.get(url);
    const $ = cheerio.load(data);
    const results = [];
    $("table.otable").each((_, el) => {
      const element = $(el);
      const title = element.find(".videsc a").text().trim();
      let link = element.find(".videsc a").attr("href");
      if (link && !link.startsWith(this.baseUrl) && link.startsWith("/")) {
        link = this.baseUrl + link;
      } else if (link && !link.startsWith("http")) {
        link = `${this.baseUrl}/${link.startsWith("/") ? "" : "/"}${link}`;
      }
      let image = element.find("img").attr("src");
      if (image && !image.startsWith(this.baseUrl) && image.startsWith("/")) {
        image = this.baseUrl + image;
      } else if (image && !image.startsWith("http")) {
        image = `${this.baseUrl}/${image.startsWith("/") ? "" : "/"}${image}`;
      }
      const description = element.find("p.des").text().trim();
      const labelEls = element.find(".label");
      const year = labelEls.last().text().trim();
      if (title && link) {
        results.push({
          title: title,
          link: link,
          image: image,
          year: year,
          description: description
        });
      }
    });
    return results;
  }
  async detail(url = "") {
    if (!url || url.trim() === "") {
      throw new Error("URL detail tidak valid atau kosong.");
    }
    const {
      data
    } = await this.client.get(url);
    const $ = cheerio.load(data);
    const title = $("h1.title").text().trim();
    let imageSrc = $(".detail img").attr("src") || "";
    if (imageSrc.startsWith("/")) {
      imageSrc = this.baseUrl + imageSrc;
    } else if (imageSrc && !imageSrc.startsWith("http")) {
      imageSrc = `${this.baseUrl}/${imageSrc}`;
    }
    const genres = [];
    $(".detail li a").each((_, el) => {
      genres.push($(el).text().trim());
    });
    const description = $(".detail p").text().trim();
    const episodes = [];
    $(".ep a").each((_, el) => {
      const episodeTitle = $(el).text().trim();
      let epLink = $(el).attr("href");
      if (epLink) {
        if (epLink.startsWith("/")) {
          epLink = this.baseUrl + epLink;
        } else if (!epLink.startsWith("http")) {
          epLink = `${this.baseUrl}/${epLink}`;
        }
        episodes.push({
          episode: episodeTitle,
          link: epLink
        });
      }
    });
    return {
      title: title,
      image: imageSrc,
      genres: genres,
      description: description,
      episodes: episodes
    };
  }
  async download(episodeUrl = "") {
    if (!episodeUrl || episodeUrl.trim() === "") {
      throw new Error("URL episode tidak valid atau kosong.");
    }
    const {
      data: episodeHtml
    } = await this.client.get(episodeUrl);
    const $ = cheerio.load(episodeHtml);
    const title = $("h1.title").first().text().trim();
    const description = $(".detail p").text().trim();
    const videoLinks = [];
    $(".servers a.server").each((_, el) => {
      const label = $(el).text().trim();
      let videoUrl = $(el).attr("data-video");
      if (videoUrl && videoUrl.startsWith("//")) {
        videoUrl = "https:" + videoUrl;
      }
      if (label && videoUrl) {
        videoLinks.push({
          label: label,
          videoUrl: videoUrl
        });
      }
    });
    const gdriveHdLinkObj = videoLinks.find(v => v.label.toLowerCase().includes("gdrive") && v.label.toLowerCase().includes("hd"));
    const gdriveAnyLinkObj = videoLinks.find(v => v.label.toLowerCase().includes("gdrive"));
    let result = {
      title: title,
      description: description,
      videoLinks: videoLinks,
      downloadType: null,
      downloadUrl: null,
      gdriveRawLink: null,
      fileId: null,
      fileName: null,
      fileSize: null,
      mimetype: null
    };
    if (gdriveHdLinkObj && gdriveHdLinkObj.videoUrl) {
      try {
        const {
          data: gdriveHtml
        } = await axios.get(gdriveHdLinkObj.videoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        const $$ = cheerio.load(gdriveHtml);
        const gdriveRawLink = $$("#subtitlez").text().trim();
        if (gdriveRawLink && gdriveRawLink.includes("drive.google.com")) {
          const idMatch = gdriveRawLink.match(/\/d\/([^\/]+)\//) || gdriveRawLink.match(/id=([^&]+)/);
          if (idMatch && idMatch[1]) {
            const fileId = idMatch[1];
            const driveApiUrl = `https://drive.google.com/uc?id=${fileId}&authuser=0&export=download`;
            try {
              const driveResponse = await axios.post(driveApiUrl, null, {
                headers: {
                  "accept-encoding": "gzip, deflate, br",
                  "content-length": "0",
                  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                  origin: "https://drive.google.com",
                  "user-agent": "Mozilla/5.0",
                  "x-client-data": "CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=",
                  "x-drive-first-party": "DriveWebUi",
                  "x-json-requested": "true"
                }
              });
              if (driveResponse.data && typeof driveResponse.data === "string" && driveResponse.data.startsWith(")]}'")) {
                const jsonStr = driveResponse.data.slice(4);
                const json = JSON.parse(jsonStr);
                if (json.downloadUrl) {
                  const headResponse = await axios.head(json.downloadUrl, {
                    headers: {
                      "User-Agent": "Mozilla/5.0"
                    }
                  });
                  result.downloadType = "direct_hd";
                  result.downloadUrl = json.downloadUrl;
                  result.fileName = json.fileName;
                  result.fileSize = json.sizeBytes;
                  result.mimetype = headResponse.headers["content-type"];
                  result.fileId = fileId;
                  result.gdriveRawLink = gdriveRawLink;
                  return result;
                }
              }
            } catch (apiError) {
              console.log("GDRIVE API failed, trying fallback for HD link...");
            }
          }
        }
      } catch (hdError) {
        console.log("GDRIVE HD processing failed, trying general GDrive fallback...");
      }
    }
    const targetGdriveLink = gdriveHdLinkObj || gdriveAnyLinkObj;
    if (targetGdriveLink && targetGdriveLink.videoUrl) {
      try {
        const {
          data: gdriveHtml
        } = await axios.get(targetGdriveLink.videoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        const $$ = cheerio.load(gdriveHtml);
        const gdriveRawLink = $$("#subtitlez").text().trim();
        if (gdriveRawLink && gdriveRawLink.includes("drive.google.com")) {
          const idMatch = gdriveRawLink.match(/\/d\/([^\/]+)\//) || gdriveRawLink.match(/id=([^&]+)/);
          if (idMatch && idMatch[1]) {
            const fileId = idMatch[1];
            result.downloadType = "raw_link";
            result.gdriveRawLink = gdriveRawLink;
            result.fileId = fileId;
            return result;
          }
        }
      } catch (rawError) {
        console.log("Raw GDrive link extraction failed, trying file ID only...");
      }
    }
    if (targetGdriveLink && targetGdriveLink.videoUrl) {
      try {
        const {
          data: gdriveHtml
        } = await axios.get(targetGdriveLink.videoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        const $$ = cheerio.load(gdriveHtml);
        const gdriveRawLinkElementText = $$("#subtitlez").text().trim();
        if (gdriveRawLinkElementText) {
          const idMatch = gdriveRawLinkElementText.match(/\/d\/([^\/]+)\//) || gdriveRawLinkElementText.match(/id=([^&]+)/);
          if (idMatch && idMatch[1]) {
            const fileId = idMatch[1];
            result.downloadType = "file_id_only";
            result.fileId = fileId;
            result.gdriveRawLink = gdriveRawLinkElementText.includes("drive.google.com") ? gdriveRawLinkElementText : null;
            return result;
          }
        }
      } catch (idError) {
        console.log("File ID only extraction failed.");
      }
    }
    if (result.downloadType) return result;
    throw new Error("No GDRIVE link found or all GDrive processing methods failed.");
  }
}
export default async function handler(req, res) {
  const animeindo = new AnimeIndo();
  try {
    const {
      action,
      query,
      url
    } = req.method === "GET" ? req.query : req.body;
    switch (action) {
      case "latest":
        const latestAnimes = await animeindo.latest();
        return res.status(200).json({
          data: latestAnimes
        });
      case "search":
        if (!query) return res.status(400).json({
          error: 'Query parameter "query" is required'
        });
        const searchResults = await animeindo.search(query);
        return res.status(200).json({
          data: searchResults
        });
      case "detail":
        if (!url) return res.status(400).json({
          error: 'URL parameter "url" is required'
        });
        const animeDetail = await animeindo.detail(url);
        return res.status(200).json({
          data: animeDetail
        });
      case "download":
        if (!url) return res.status(400).json({
          error: 'URL parameter "url" is required'
        });
        const downloadData = await animeindo.download(url);
        return res.status(200).json({
          data: downloadData
        });
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}