import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { avatarUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', backgroundUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', userCreatedTimestamp = 604800000, suspectTimestamp = 604800000, borderColor = '#f0f0f0', locale = 'en', overlayOpacity = 0.9 } = req.query;

    if (!avatarUrl || !backgroundUrl || !userCreatedTimestamp) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const securityImage = await new canvafy.Security()
        .setAvatar(avatarUrl)
        .setBackground('image', backgroundUrl)
        .setCreatedTimestamp(Number(userCreatedTimestamp))
        .setSuspectTimestamp(Number(suspectTimestamp))
        .setBorder(borderColor)
        .setLocale(locale)
        .setAvatarBorder(borderColor)
        .setOverlayOpacity(Number(overlayOpacity))
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(securityImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate security image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
