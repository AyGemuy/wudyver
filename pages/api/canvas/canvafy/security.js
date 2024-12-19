import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { avatarUrl = 'https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg', backgroundUrl = 'https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg', userCreatedTimestamp = 604800000, suspectTimestamp = 604800000, borderColor = '#f0f0f0', locale = 'en', overlayOpacity = 0.9 } = req.query;

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
