import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    userId = "wudy",
      borderColor = "f0f0f0",
      activityName = "wudy",
      activityDetails = "wudy",
      largeImage = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      smallImage = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg"
  } = req.method === "GET" ? req.query : req.body;
  if (!userId || !activityName || !activityDetails || !largeImage || !smallImage) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const profileImage = await new canvafy.Profile().setUser(userId).setBorder("#" + borderColor).setActivity({
      activity: {
        name: activityName,
        type: 0,
        details: activityDetails,
        assets: {
          largeText: "📝 Editing a NPM",
          smallText: "❓ Visual Studio Code",
          largeImage: largeImage,
          smallImage: smallImage
        }
      },
      largeImage: largeImage
    }).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(profileImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate profile image"
    });
  }
}