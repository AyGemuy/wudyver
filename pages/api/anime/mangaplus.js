import axios from "axios";
class MangaPlus {
  constructor() {
    this.BASE_URL = "https://mangaplus.shueisha.co.jp";
    this.API_URL = "https://jumpg-webapi.tokyo-cdn.com/api";
    this.request = axios.create({
      baseURL: this.API_URL,
      headers: {
        Referer: `${this.BASE_URL}/`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      },
      responseType: "json"
    });
  }
  async manga_detail({
    id
  }) {
    try {
      const response = await this.request.get(`/title_detailV3?title_id=${id}&format=json`);
      const data = response.data;
      const results = data.success?.titleDetailView;
      return results ? results : [];
    } catch (error) {
      console.error(`Error fetching manga details for ID ${id}:`, error);
      return null;
    }
  }
  async chapters({
    id
  }) {
    try {
      const response = await this.request.get(`/title_detailV3?title_id=${id}&format=json`);
      return this.parseChapters(response.data);
    } catch (error) {
      console.error(`Error fetching chapters for manga ID ${id}:`, error);
      return null;
    }
  }
  parseChapters(data) {
    const chapters = [...data.success.titleDetailView.firstChapterList ?? [], ...data.success.titleDetailView.lastChapterList ?? []];
    return chapters.reverse();
  }
  async chapter_detail({
    id
  }) {
    try {
      const response = await this.request.get(`/manga_viewer?chapter_id=${id}&split=no&img_quality=high&format=json`);
      const data = response.data;
      const pages = data.success.mangaViewer?.pages.map(page => page.mangaPage).filter(page => page).map(page => page?.encryptionKey ? `${page?.imageUrl}#${page?.encryptionKey}` : "");
      return pages ? pages : [];
    } catch (error) {
      console.error(`Error fetching chapter details for chapter ID ${id}:`, error);
      return null;
    }
  }
  async featured() {
    try {
      const response = await this.request.get("/featuredV2?lang=eng&clang=eng&format=json");
      const data = response.data;
      const results = data.success?.featuredTitlesViewV2?.contents?.find(x => x.titleList && x.titleList.listName == "WEEKLY SHONEN JUMP")?.titleList.featuredTitles;
      return results ? results : [];
    } catch (error) {
      console.error("Error fetching featured titles:", error);
      return null;
    }
  }
  async popular() {
    try {
      const response = await this.request.get("/title_list/ranking?format=json");
      const data = response.data;
      const results = data.success?.titleRankingView;
      return results ? results : [];
    } catch (error) {
      console.error("Error fetching popular titles:", error);
      return null;
    }
  }
  async latest() {
    try {
      const response = await this.request.get("/web/web_homeV4?lang=eng&format=json");
      const data = response.data;
      const results = data.success.webHomeViewV4?.groups.flatMap(ex => ex.titleGroups).flatMap(ex => ex.titles).map(title => title.title);
      return results ? results : [];
    } catch (error) {
      console.error("Error fetching latest updates:", error);
      return null;
    }
  }
  async search({
    query
  }) {
    try {
      const response = await this.request.get(`/title_list/allV2?format=JSON&filter=${encodeURI(query)}&format=json`);
      const data = response.data;
      const ltitle = query?.toLowerCase() ?? "";
      const results = data.success?.allTitlesViewV2?.AllTitlesGroup.flatMap(group => group.titles).filter(title => title.author?.toLowerCase().includes(ltitle) || title.name.toLowerCase().includes(ltitle));
      return results ? results : [];
    } catch (error) {
      console.error(`Error searching for query "${query}":`, error);
      return null;
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
      error: "Missing required field: action",
      required: {
        action: "manga_detail | chapters | chapter_detail | featured | popular | latest | search"
      }
    });
  }
  const mangaplus = new MangaPlus();
  const allowedActions = ["manga_detail", "chapters", "chapter_detail", "featured", "popular", "latest", "search"];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({
      error: `Invalid action: ${action}. Allowed: ${allowedActions.join(" | ")}`
    });
  }
  try {
    let result;
    switch (action) {
      case "manga_detail":
      case "chapters":
      case "chapter_detail":
      case "search":
        const requiredParams = {
          manga_detail: "id",
          chapters: "id",
          chapter_detail: "id",
          search: "query"
        };
        const requiredParam = requiredParams[action];
        if (!params[requiredParam]) {
          return res.status(400).json({
            error: `Missing required field: ${requiredParam} (required for ${action})`
          });
        }
        result = await mangaplus[action](params);
        break;
      default:
        result = await mangaplus[action]();
        break;
    }
    if (result === null) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch data for action: ${action}`
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Processing error for action "${action}":`, error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}