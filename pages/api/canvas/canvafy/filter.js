import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { type = 'affect', imageUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', imageUrl2 = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg' } = req.query;

    if (!type || !imageUrl) {
      return res.status(400).json({ error: 'Missing required parameters: type or imageUrl' });
    }

    try {
      let filteredImage;

      switch (type) {
        case 'affect':
          filteredImage = await canvafy.Image.affect(imageUrl);
          break;
        case 'batslap':
          if (!imageUrl2) return res.status(400).json({ error: 'Missing imageUrl2 for batslap' });
          filteredImage = await canvafy.Image.batslap(imageUrl, imageUrl2);
          break;
        case 'beautiful':
          filteredImage = await canvafy.Image.beautiful(imageUrl);
          break;
        case 'darkness':
          if (!req.query.intensity) return res.status(400).json({ error: 'Missing intensity for darkness' });
          filteredImage = await canvafy.Image.darkness(imageUrl, parseInt(req.query.intensity));
          break;
        case 'delete':
          filteredImage = await canvafy.Image.delete(imageUrl);
          break;
        case 'gay':
          filteredImage = await canvafy.Image.gay(imageUrl);
          break;
        case 'greyscale':
          filteredImage = await canvafy.Image.greyscale(imageUrl);
          break;
        case 'invert':
          filteredImage = await canvafy.Image.invert(imageUrl);
          break;
        case 'kiss':
          if (!imageUrl2) return res.status(400).json({ error: 'Missing imageUrl2 for kiss' });
          filteredImage = await canvafy.Image.kiss(imageUrl, imageUrl2);
          break;
        default:
          return res.status(400).json({ error: 'Invalid type specified' });
      }

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(filteredImage);
    } catch (error) {
      res.status(500).json({ error: `Failed to apply filter: ${error.message}` });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
