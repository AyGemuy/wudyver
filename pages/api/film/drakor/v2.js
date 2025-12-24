import axios from "axios";
import * as cheerio from "cheerio";
class DrakorKita {
  constructor(baseUrl = "https://drakorkita.in/") {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        accept: "text/plain, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: "https://drakorkita.in",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://drakorkita.in/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "Android",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async fetchData(url) {
    try {
      const response = await this.client.get(url);
      return response.data ?? null;
    } catch (error) {
      console.error("Fetch Error:", error.message);
      return null;
    }
  }
  async detail(url) {
    try {
      const data = await this.fetchData(url);
      if (!data) return {};
      const $ = cheerio.load(data);
      const info = {
        title: $("title").text() || null,
        description: $('meta[name="description"]').attr("content") || null,
        headline: $('h1[itemprop="headline"]').text() || null,
        originalTitle: $("span.alter").text() || null,
        genres: $(".gnr p a").map((i, el) => $(el).text().trim()).get() || [],
        score: $(".rating strong").text().replace("Score : ", "") || null,
        ratings: $(".rating p small").text() || null,
        imageUrl: $(".ime img").attr("src") || null,
        synopsis: $(".sinopsis p").text().trim() || null,
        type: $('li:contains("Type") .type').text().trim() || null,
        status: $('li:contains("Status") .stats').text().trim() || null,
        releaseDate: $('li:contains("Release Date") a').text().trim() || null,
        country: $('li:contains("Country") a').text().trim() || null,
        director: $('li:contains("Director") a').text().trim() || null,
        videoLength: $('li:contains("Video Length")').text().replace("Video Length:", "").trim() || null,
        views: $('li:contains("Views")').text().replace("Views:", "").trim() || null,
        postedOn: $('li:contains("Posted on")').text().replace("Posted on:", "").trim() || null,
        stars: $('li:contains("Stars") a').map((i, el) => $(el).text().trim()).get() || []
      };
      return {
        title: $('h1[itemprop="headline"]').text().trim() ?? "No Title",
        genres: $(".gnr p a").map((_, el) => $(el).text().trim()).get() ?? [],
        rating: $(".rating strong").text().trim().replace("Score : ", "") ?? "N/A",
        views: $('.anf li:contains("Views") span').text().trim().replace("Views: ", "") ?? "0",
        releaseDate: $('.anf li:contains("Release Date") a').text().trim() ?? "Unknown",
        director: $('.anf li:contains("Director") a').text().trim() ?? "N/A",
        stars: $(".anf li.mv-description a").map((_, el) => $(el).text().trim()).get() ?? [],
        synopsis: $(".sinopsis p").text().trim() ?? "No Synopsis",
        links: $(".pagination a").map((_, el) => {
          const match = $(el).attr("onclick")?.match(/loadEpisode\('([^']+)','([^']+)'\)/);
          return match ? {
            movie_id: match[1],
            tag: match[2]
          } : null;
        }).get().filter(Boolean) ?? [],
        info: info,
        url: url
      };
    } catch (error) {
      console.error("Error fetching movie details:", error.message);
      return {};
    }
  }
  async home() {
    try {
      const data = await this.fetchData("/");
      if (!data) return [];
      const $ = cheerio.load(data);
      return $(".col-lg-3.col-md-3.col-sm-6.mb-3").map((_, element) => {
        const container = $(element);
        const link = container.find("a.poster").attr("href") ?? "";
        return {
          title: container.find("a.poster").attr("title") ?? "No Title",
          link: `${this.baseUrl}${link.replace(/^\//, "")}` ?? "",
          image: container.find("img.poster").attr("src") ?? "",
          duration: container.find(".type").text().trim() ?? "N/A",
          resolution: this.cleanResolution(container.find(".titit span").text().trim()) ?? "Unknown",
          episodes: container.find(".rate").text().trim() ?? "0",
          rating: container.find(".rat").text().trim() ?? "N/A"
        };
      }).get() ?? [];
    } catch (error) {
      console.error("Error fetching home data:", error.message);
      return [];
    }
  }
  async search(query) {
    try {
      const data = await this.fetchData(`/all?q=${encodeURIComponent(query)}`);
      if (!data) return [];
      const $ = cheerio.load(data);
      return $(".row.item-list .col-6").map((_, el) => {
        const link = $(el).find("a.poster").attr("href") ?? "";
        return {
          title: $(el).find("a.poster").attr("title") ?? "No Title",
          link: link ? `${this.baseUrl}${link.replace(/^\//, "")}` : "",
          image: $(el).find("img.poster").attr("src") ?? "",
          duration: $(el).find(".type").text().trim() ?? "N/A",
          resolution: this.cleanResolution($(el).find(".titit span").text().trim()) ?? "Unknown",
          year: $(el).find(".titit span:last-child").text().trim() ?? "N/A",
          rating: $(el).find(".rat").text().trim() ?? "N/A"
        };
      }).get() ?? [];
    } catch (error) {
      console.error("Error searching:", error.message);
      return [];
    }
  }
  cleanResolution(text) {
    return text.match(/(\d{3,4}p)/)?.[1] ?? "Unknown";
  }
  async download(movie_id, tag) {
    try {
      const apiClient = axios.create({
        baseURL: "https://api.drakor.in/api",
        headers: this.client.defaults.headers
      });
      const episodeData = (await apiClient.get(`/episode.php?movie_id=${movie_id}&tag=${tag}`)).data ?? {};
      const serverData = (await apiClient.get(`/server_mob.php?episode_id=${episodeData.first_ep_id}&tag=${tag}`)).data ?? {};
      const videoData = (await apiClient.get(`/video.php?id=${serverData.data.episode_id}&qua=web&server_id=f2&tag=${tag}`)).data ?? {};
      const videoSbData = (await apiClient.get(`/video_sb.php?id=${serverData.data.episode_id}&qua=web&res=688&server_id=f2&tag=${tag}`)).data ?? {};
      const dlData = (await apiClient.get(`/ajax_dl_all.php?domain=https://cdn.drakor.in&media_type=movie&id=${movie_id}`)).data ?? "";
      const $dlData = cheerio.load(dlData);
      const dlDataRes = {
        video: $dlData("a.btn.btn-sm.btn-success").attr("href") ?? "",
        subtitle: $dlData("a.btn.btn-sm.btn-info").attr("href") ?? ""
      };
      const fileData = (await apiClient.get(`/dlfile.php?id=${videoData.download.split("/").pop()}`)).data ?? {};
      return {
        episode: episodeData,
        server: serverData,
        video: videoData,
        video_sb: videoSbData,
        dl: dlDataRes,
        file: fileData
      };
    } catch (error) {
      console.error("Error downloading:", error.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    movie_id,
    tag
  } = req.method === "GET" ? req.query : req.body;
  const drakorkita = new DrakorKita();
  try {
    switch (action) {
      case "home":
        const latestResults = await drakorkita.home();
        return res.status(200).json({
          success: true,
          data: latestResults
        });
      case "search":
        if (!query) throw new Error("Paramenter 'query' diperlukan untuk pencarian.");
        const searchResults = await drakorkita.search(query);
        return res.status(200).json({
          success: true,
          data: searchResults
        });
      case "detail":
        if (!url) throw new Error("Paramenter 'url' diperlukan untuk melihat detail.");
        const detailResults = await drakorkita.detail(url);
        return res.status(200).json({
          success: true,
          data: detailResults
        });
      case "download":
        if (!movie_id && !tag) throw new Error("Paramenter 'movie_id dan tag' diperlukan untuk melihat.");
        const chaptersResults = await drakorkita.download(movie_id, tag);
        return res.status(200).json({
          success: true,
          data: chaptersResults
        });
      default:
        throw new Error("Aksi tidak dikenali. Gunakan 'latest', 'search', 'detail', atau 'chapters'.");
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}