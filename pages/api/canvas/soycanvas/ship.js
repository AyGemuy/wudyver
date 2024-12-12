import soycanvas from 'soycanvas';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { user1Avatar = 'https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg', user2Avatar = 'https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg', backgroundImage = 'https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg', borderColor = '#f0f0f0', overlayOpacity = 0.5 } = req.query;

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
