import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId = 'wudy', borderColor = '#f0f0f0', activityName = 'wudy', activityDetails = 'wudy', largeImage = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', smallImage = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg' } = req.query;

    if (!userId || !activityName || !activityDetails || !largeImage || !smallImage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const profileImage = await new canvafy.Profile()
        .setUser(userId)
        .setBorder(borderColor)
        .setActivity({
          activity: {
            name: activityName,
            type: 0,
            details: activityDetails,
            assets: {
              largeText: '📝 Editing a NPM',
              smallText: '❓ Visual Studio Code',
              largeImage,
              smallImage,
            },
          },
          largeImage,
        })
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(profileImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate profile image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
