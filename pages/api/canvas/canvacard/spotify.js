import { Spotify } from "canvacard";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { author, album, title, image, startTimestamp, endTimestamp } = req.query;

  const spotifyAuthor = author || "wudy";
  const spotifyAlbum = album || "wudy";
  const spotifyTitle = title || "wudy";
  const spotifyImage = image || "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg";
  const spotifyStartTimestamp = startTimestamp || Date.now() - 10000;
  const spotifyEndTimestamp = endTimestamp || Date.now() + 50000;

  try {
    const spotifyCard = new Spotify()
      .setAuthor(spotifyAuthor)
      .setAlbum(spotifyAlbum)
      .setStartTimestamp(spotifyStartTimestamp)
      .setEndTimestamp(spotifyEndTimestamp)
      .setImage(spotifyImage)
      .setTitle(spotifyTitle);

    const data = await spotifyCard.build("Cascadia Code PL, Noto Color Emoji");

    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
