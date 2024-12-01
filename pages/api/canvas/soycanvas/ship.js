import soycanvas from 'soycanvas';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { user1Avatar = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', user2Avatar = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', backgroundImage = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', borderColor = '#f0f0f0', overlayOpacity = 0.5 } = req.query;

    if (!user1Avatar || !user2Avatar || !backgroundImage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const shipImage = await new soycanvas.Ship()
        .setAvatars(user1Avatar, user2Avatar)
        .setBackground('image', backgroundImage)
        .setBorder(borderColor)
        .setOverlayOpacity(overlayOpacity)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(shipImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate ship image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
