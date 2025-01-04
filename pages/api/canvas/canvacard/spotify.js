import {
  Spotify
} from "canvacard";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }
  const {
    author = "wudy",
      album = "wudy",
      title = "wudy",
      image = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      startTimestamp = Date.now() - 1e4,
      endTimestamp = Date.now() + 5e4
  } = req.method === "GET" ? req.query : req.body;
  try {
    const spotifyCard = new Spotify().setAuthor(author).setAlbum(album).setStartTimestamp(startTimestamp).setEndTimestamp(endTimestamp).setImage(image).setTitle(title);
    const data = await spotifyCard.build("Cascadia Code PL, Noto Color Emoji");
    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
}