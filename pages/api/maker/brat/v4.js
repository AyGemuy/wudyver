import axios from 'axios';

export default async function handler(req, res) {
  const method = req.method;
  const { prompt = "Daffa", font_text = "100", blur_level = "5" } = method === 'GET' ? req.query : req.body;

  const url = 'https://www.bestcalculators.org/wp-admin/admin-ajax.php';
  const headers = {
    'authority': 'www.bestcalculators.org',
    'accept': '*/*',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://www.bestcalculators.org',
    'referer': 'https://www.bestcalculators.org/online-generators/brat-text-generator/',
    'user-agent': 'Postify/1.0.0',
    'x-requested-with': 'XMLHttpRequest'
  };

  const data = new URLSearchParams({
    'action': 'generate_brat_text',
    'text': prompt,
    'fontSize': font_text,
    'blurLevel': blur_level
  });

  try {
    const response = await axios.post(url, data.toString(), { headers, responseType: 'arraybuffer' });

    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(response.data);

    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate text image' });
  }
}
