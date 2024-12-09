import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const response = await axios.get('https://aiovd.com/wp-json/aio-dl/video-data', {
      params: { url },
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Internal server error',
      error: error.message,
    });
  }
}
