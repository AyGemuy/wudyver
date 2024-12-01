import axios from 'axios';

async function generateWhatsAppStatus(profileImage, mainImage, caption, views) {
  const url = 'https://ruloaooa-swgen.hf.space/generate';
  const data = {
    profileImage,
    mainImage,
    caption,
    views
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Gagal menghasilkan WhatsApp status');
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { profileImage, mainImage, caption, views } = req.query;

    if (!profileImage || !mainImage || !caption || !views) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await generateWhatsAppStatus(profileImage, mainImage, caption, views);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate WhatsApp status', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
