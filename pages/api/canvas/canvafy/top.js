import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { topData = [], background = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', opacity = 0.6, scoreMessage = 'Message:', abbreviateNumber = false, colors = {} } = req.query;

    const usersData = topData.length ? JSON.parse(topData) : [
      { top: 1, avatar: "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg", tag: "Beş#0005", score: 5555 },
      { top: 2, avatar: "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg", tag: "Lulushu#1337", score: 1337 },
    ];

    try {
      const topImage = await new canvafy.Top()
        .setOpacity(opacity)
        .setScoreMessage(scoreMessage)
        .setAbbreviateNumber(abbreviateNumber)
        .setBackground('image', background)
        .setColors(colors)
        .setUsersData(usersData)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(topImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate top image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
