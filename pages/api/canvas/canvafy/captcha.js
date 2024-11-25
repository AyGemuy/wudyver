import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { backgroundUrl = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', borderColor = '#f0f0f0', overlayOpacity = 0.7, keyLength = 15 } = req.query;

    if (!backgroundUrl) {
      return res.status(400).json({ error: 'Missing background URL' });
    }

    try {
      const captchaImage = await new canvafy.Captcha()
        .setBackground('image', backgroundUrl)
        .setCaptchaKey(canvafy.Util.captchaKey(Number(keyLength)))
        .setBorder(borderColor)
        .setOverlayOpacity(Number(overlayOpacity))
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(captchaImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate captcha image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
