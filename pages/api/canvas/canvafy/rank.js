import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { username = 'wudy', avatarUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', status = 'offline', level = 2, rank = 1, currentXp = 100, requiredXp = 400, background = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', borderColor = '#fff' } = req.query;

    if (!username || !avatarUrl) return res.status(400).json({ error: 'Missing required parameters' });

    try {
      const rankImage = await new canvafy.Rank()
        .setAvatar(avatarUrl)
        .setBackground('image', background)
        .setUsername(username)
        .setBorder(borderColor)
        .setStatus(status)
        .setLevel(level)
        .setRank(rank)
        .setCurrentXp(currentXp)
        .setRequiredXp(requiredXp)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(rankImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate rank image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
