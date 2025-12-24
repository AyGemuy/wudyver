import axios from "axios";
const api = "https://plte.link/aiwallpapers/api";
const headers = {
  "Content-Type": "application/json",
  "User-Agent": "Postify/1.0.0"
};
const formatResult = wallpaper => ({
  id: wallpaper.id,
  title: wallpaper.title,
  description: wallpaper.description,
  image: wallpaper.image,
  thumbnail: wallpaper.thumbnail,
  colors: wallpaper.colors,
  tags: wallpaper.tags,
  likes: wallpaper.likes,
  views: wallpaper.views,
  downloads: wallpaper.downloads,
  resolution: wallpaper.resolution,
  size: wallpaper.size,
  categoryName: wallpaper.category_name,
  isPremium: wallpaper.isPremium,
  createdAt: wallpaper.created_at
});
const request = async (endpoint, params) => {
  const {
    data
  } = await axios.get(`${api}/${endpoint}`, {
    params: params,
    headers: headers
  });
  return data;
};
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  try {
    const {
      action,
      userId,
      query: searchQuery,
      catId,
      type
    } = query;
    if (action === "search") {
      const data = await request("search", {
        user_id: userId || "550e8400-e29b-41d4-a716-446655440000",
        order_by: "created_at",
        search: searchQuery || "Abstract"
      });
      return res.status(200).json({
        currentPage: data.current_page,
        wallpapers: Array.isArray(data.data) ? data.data.map(formatResult) : []
      });
    }
    if (action === "detail") {
      const data = await request("wallpapers", {
        category_id: String(catId || 2),
        order_by: "created_at",
        type: type || "fluid",
        isCollection: "0"
      });
      return res.status(200).json({
        wallpapers: Array.isArray(data.data) ? data.data.map(formatResult) : []
      });
    }
    return res.status(400).json({
      error: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}