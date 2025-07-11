import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    topData = [],
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      opacity = .6,
      scoreMessage = "Message:",
      abbreviateNumber = false,
      colors = {}
  } = req.method === "GET" ? req.query : req.body;
  const usersData = topData.length ? JSON.parse(topData) : [{
    top: 1,
    avatar: "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
    tag: "Beş#0005",
    score: 5555
  }, {
    top: 2,
    avatar: "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
    tag: "Lulushu#1337",
    score: 1337
  }];
  try {
    const topImage = await new canvafy.Top().setOpacity(opacity).setScoreMessage(scoreMessage).setAbbreviateNumber(abbreviateNumber).setBackground("image", background).setColors(colors).setUsersData(usersData).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(topImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate top image"
    });
  }
}