import {
  AnimeWallpaper,
  AnimeSource
} from "anime-wallpaper";
const wall = new AnimeWallpaper();
export default async function handler(req, res) {
  const {
    source = "random",
      query,
      resolution = "1920x1080",
      game,
      postType,
      live2d,
      page = 1,
      type = "sfw",
      aiArt = false
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (source === "random" && !resolution) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'resolution' diperlukan untuk source 'random'."
      });
    }
    if (source === "wallhaven" && !query) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'query' diperlukan untuk source 'wallhaven'."
      });
    }
    if (source === "wallpapers" && !query) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'query' diperlukan untuk source 'wallpapers'."
      });
    }
    if (source === "zerochan" && !query) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'query' diperlukan untuk source 'zerochan'."
      });
    }
    if (source === "live2d" && !live2d) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'live2d' diperlukan untuk source 'live2d'."
      });
    }
    if (source === "hoyolab" && (!game || !postType)) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'game' dan 'postType' diperlukan untuk source 'hoyolab'."
      });
    }
    if (source === "pinterest" && !query) {
      return res.status(400).json({
        success: false,
        error: "Paramenter 'query' diperlukan untuk source 'pinterest'."
      });
    }
    const result = source === "random" ? await wall.random({
      resolution: resolution
    }) : source === "wallhaven" ? await wall.search({
      title: query,
      page: page,
      type: type,
      aiArt: aiArt === "true"
    }, AnimeSource.WallHaven) : source === "wallpapers" ? await wall.search({
      title: query
    }, AnimeSource.Wallpapers) : source === "zerochan" ? await wall.search({
      title: query
    }, AnimeSource.ZeroChan) : source === "live2d" ? await wall.live2d(live2d) : source === "hoyolab" ? await wall.hoyolab({
      game: game,
      postType: postType
    }) : source === "pinterest" ? await wall.pinterest(query) : null;
    if (!result) return res.status(400).json({
      success: false,
      error: "Invalid source parameter."
    });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}