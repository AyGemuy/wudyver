import soycanvas from "soycanvas";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      author = "wudy",
        album = "wudy",
        timestamp = 608e3,
        image = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        title = "wudy",
        blur = 5,
        overlayOpacity = .7
    } = req.method === "GET" ? req.query : req.body;
    if (!author || !album || !timestamp || !image || !title) {
      return res.status(400).json({
        error: "Missing required parameters"
      });
    }
    try {
      const spotifyImage = await new soycanvas.oldSpotify().setAuthor(author).setAlbum(album).setTimestamp(...timestamp.split(",").map(Number)).setImage(image).setTitle(title).setBlur(blur).setOverlayOpacity(overlayOpacity).build();
      Promise.resolve(spotifyImage).then(() => {
        console.log("Query processing complete!");
      }).catch(error => {
        console.error("Error processing query:", error);
      });
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(spotifyImage);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate spotify image"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}