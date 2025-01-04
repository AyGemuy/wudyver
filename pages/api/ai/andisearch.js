import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class Andi {
  constructor() {
    this.authorization = uuidv4();
    this.securityToken = uuidv4();
  }

  generateXAmzDate() {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
  }

  async chat(prompt) {
    const xAmzDate = this.generateXAmzDate();

    const payload = {
      query: prompt,
      serp: {
        results_type: "Search",
        answer: "",
        type: "navigation",
        title: "",
        description: "",
        image: "",
        link: "",
        source: "liftndrift.com",
        engine: "andi-b",
        results: [
          {
            title: "Sample title",
            link: "https://example.com",
            desc: "Sample description",
            image: "",
            type: "website",
            source: "example.com"
          }
        ]
      }
    };

    const headers = {
      "accept": "text/event-stream",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
      "andi-auth-key": "andi-summarizer",
      "andi-origin": "x-andi-origin",
      "authorization": this.authorization,
      "content-type": "application/json",
      "dnt": "1",
      "origin": "https://andisearch.com",
      "priority": "u=1, i",
      "sec-ch-ua": '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
      "x-amz-date": xAmzDate,
      "x-amz-security-token": this.securityToken
    };

    try {
      const response = await axios.post('https://write.andisearch.com/v1/write_streaming', payload, { headers });
      return response.data;
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      throw new Error('An error occurred while processing your request.');
    }
  }
}

export default async function handler(req, res) {
  const prompt = req.method === "GET" ? req.query.prompt : req.body.prompt;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const andi = new Andi();
    const result = await andi.chat(prompt);
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
