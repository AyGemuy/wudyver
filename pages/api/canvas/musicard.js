import {
  Classic,
  ClassicPro,
  Dynamic,
  Mini,
  Upcoming
} from "musicardmodded";
const actions = {
  classic: "Classic",
  classicpro: "ClassicPro",
  dynamic: "Dynamic",
  mini: "Mini",
  upcoming: "Upcoming"
};
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.query;
    if (!action || !actions[action]) {
      return res.status(400).json({
        error: "Invalid action. Available actions:",
        actions: Object.keys(actions)
      });
    }
    let musicard;
    const thumbnailImage = params.thumbnailImage || "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg";
    const backgroundColor = "#" + params.backgroundColor || "#070707";
    const progress = params.progress || 10;
    const progressColor = "#" + params.progressColor || "#FF7A00";
    const progressBarColor = params.progressBarColor || "#5F2D00";
    const name = params.name || "wudy";
    const nameColor = "#" + params.nameColor || "#FF7A00";
    const author = params.author || "wudy";
    const authorColor = "#" + params.authorColor || "#696969";
    const startTime = params.startTime || "0:00";
    const endTime = params.endTime || "4:00";
    const timeColor = "#" + params.timeColor || "#FF7A00";
    switch (action) {
      case "classic":
        musicard = await Classic({
          thumbnailImage: thumbnailImage,
          backgroundColor: backgroundColor,
          progress: progress,
          progressColor: progressColor,
          progressBarColor: progressBarColor,
          name: name,
          nameColor: nameColor,
          author: author,
          authorColor: authorColor,
          startTime: startTime,
          endTime: endTime,
          timeColor: timeColor
        });
        break;
      case "classicpro":
        musicard = await ClassicPro({
          thumbnailImage: thumbnailImage,
          backgroundColor: backgroundColor,
          progress: progress,
          progressColor: progressColor,
          progressBarColor: progressBarColor,
          name: name,
          nameColor: nameColor,
          author: author,
          authorColor: authorColor,
          startTime: startTime,
          endTime: endTime,
          timeColor: timeColor
        });
        break;
      case "dynamic":
        musicard = await Dynamic({
          thumbnailImage: thumbnailImage,
          backgroundColor: backgroundColor,
          progress: progress,
          progressColor: progressColor,
          progressBarColor: progressBarColor,
          name: name,
          nameColor: nameColor,
          author: author,
          authorColor: authorColor
        });
        break;
      case "mini":
        musicard = await Mini({
          thumbnailImage: thumbnailImage,
          backgroundColor: backgroundColor,
          progress: progress,
          progressColor: progressColor,
          progressBarColor: progressBarColor,
          name: name,
          nameColor: nameColor,
          author: author,
          authorColor: authorColor
        });
        break;
      case "upcoming":
        const backgroundImage = params.backgroundImage || null;
        musicard = await Upcoming({
          thumbnailImage: thumbnailImage,
          backgroundImage: backgroundImage,
          imageDarkness: params.imageDarkness || 70,
          author: author,
          title: params.title || "wudy",
          trackIndexBackgroundRadii: params.trackIndexBackgroundRadii || [10, 20, 30, 40, 50, 60, 70, 80, 80, 100]
        });
        break;
      default:
        return res.status(400).json({
          error: "Unsupported action"
        });
    }
    if (Buffer.isBuffer(musicard)) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(musicard);
    }
    return res.status(400).json({
      error: "Invalid result type"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}