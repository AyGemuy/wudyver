import soycanvas from 'soycanvas';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { avatarUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', background = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', title = 'Welcome', description = 'Welcome to this server, go read the rules please!', borderColor = '#2a2e35', avatarBorderColor = '#2a2e35', overlayOpacity = 0.3 } = req.query;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const welcomeImage = await new soycanvas.WelcomeLeave()
        .setAvatar(avatarUrl)
        .setBackground('image', background)
        .setTitle(title)
        .setDescription(description)
        .setBorder(borderColor)
        .setAvatarBorder(avatarBorderColor)
        .setOverlayOpacity(overlayOpacity)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(welcomeImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate welcome image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
