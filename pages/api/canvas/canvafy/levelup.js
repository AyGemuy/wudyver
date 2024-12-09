import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { avatarUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', backgroundUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', username = 'wudy', borderColor = '#000000', avatarBorderColor = '#ff0000', overlayOpacity = 0.7, currentLevel = 55, nextLevel = 56 } = req.query;

    if (!avatarUrl || !backgroundUrl || !username) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const levelUpImage = await new canvafy.LevelUp()
        .setAvatar(avatarUrl)
        .setBackground('image', backgroundUrl)
        .setUsername(username)
        .setBorder(borderColor)
        .setAvatarBorder(avatarBorderColor)
        .setOverlayOpacity(overlayOpacity)
        .setLevels(currentLevel, nextLevel)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(levelUpImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate level-up image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
