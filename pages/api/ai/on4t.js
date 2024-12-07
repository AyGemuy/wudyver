import axios from 'axios';
import * as cheerio from 'cheerio';
import { FormData } from 'formdata-node';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.query;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const htmlResponse = await axios.get('https://on4t.com/free-chatgpt');
    const $ = cheerio.load(htmlResponse.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    if (!csrfToken) throw new Error('CSRF token not found');

    const formData = new FormData();
    formData.append('input_text', prompt);
    formData.append('toolname', 'helpful-assistant.');

    const response = await axios.post(
      'https://on4t.com/chatgpt-process',
      formData,
      {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
    });
  }
}
