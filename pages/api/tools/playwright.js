import axios from 'axios';

const playwright = {
  avLang: ['javascript', 'python', 'java', 'csharp'],  
  
  request: async function(language = 'javascript', code) {
    if (!this.avLang.includes(language.toLowerCase())) {
      throw new Error(`Language "${language}" tidak support. Pilih Language yang tersedia: ${this.avLang.join(', ')}`);
    }

    const url = 'https://try.playwright.tech/service/control/run';
    const headers = {
      'authority': 'try.playwright.tech',
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://try.playwright.tech',
      'referer': 'https://try.playwright.tech/?l=playwright-test',
      'user-agent': 'Postify/1.0.0',
    };

    const data = {
      code: code,
      language: language
    };

    try {
      const response = await axios.post(url, data, { headers });
      const { success, error, version, duration, output, files } = response.data;
      return { success, error, version, duration, output, files }; 
    } catch (error) {
      if (error.response) {
        const { success, error: errMsg, version, duration, output, files } = error.response.data; 
        return { success, error: errMsg, version, duration, output, files };
      } else {
        throw new Error(error.message);
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { language, code } = req.body;
    
    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required' });
    }

    try {
      const result = await playwright.request(language, code);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    // Handle any non-POST request here (if needed)
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
