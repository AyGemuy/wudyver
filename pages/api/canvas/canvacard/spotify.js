import { Spotify } from "canvacard";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { author, album, title, image, startTimestamp, endTimestamp } = req.query;

  const spotifyAuthor = author || "wudy";
  const spotifyAlbum = album || "wudy";
  const spotifyTitle = title || "wudy";
  const spotifyImage = image || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg";
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
