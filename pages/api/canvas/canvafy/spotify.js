import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { author = 'wudy', album = 'wudy', timestamp = 608000, image = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', title = 'wudy', blur = 5, overlayOpacity = 0.7 } = req.query;

    if (!author || !album || !timestamp || !image || !title) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const spotifyImage = await new canvafy.Spotify()
        .setAuthor(author)
        .setAlbum(album)
        .setTimestamp(...timestamp.split(',').map(Number))
        .setImage(image)
        .setTitle(title)
        .setBlur(blur)
        .setOverlayOpacity(overlayOpacity)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(spotifyImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate spotify image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
