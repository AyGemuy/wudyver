import axios from 'axios';

class YouTubeDL {
  constructor() {
    this.baseUrl = 'https://ytdlp.online/stream';
    this.headers = {
      'accept': 'text/event-stream',
      'accept-language': 'id-ID,id;q=0.9',
      'cache-control': 'no-cache',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    };
  }

  async fetchStream(ytUrl, type = 'best') {
    const format = type === 'mp3' 
      ? '-x --audio-format mp3' 
      : type === 'best' 
        ? '-f bestvideo+bestaudio' 
        : type === 'url' 
          ? '--get-url' 
          : '-f bestvideo+bestaudio';

    const params = new URLSearchParams({
      command: encodeURIComponent(`${format} ${ytUrl}`)
    });

    try {
      const response = await axios.get(`https://api.allorigins.win/raw?url=${this.baseUrl}?${params.toString()}`, {
        headers: this.headers
      });
      return this.parseResponse(response.data);
    } catch (error) {
      console.error('Error fetching stream:', error);
      throw error;
    }
  }

  parseResponse(data) {
    const lines = data.split('\n');
    const downloadLinkLine = lines.find(line => line.includes('<a href="/download/'));
    const statusLine = lines.find(line => line.includes('data: [youtube]'));

    const response = {};

    if (downloadLinkLine) {
      const regex = /href="([^"]+)"/;
      const match = downloadLinkLine.match(regex);

      if (match && match[1]) {
        response.downloadUrl = `https://ytdlp.online${match[1]}`;
      }
    }

    if (statusLine) {
      const status = statusLine.split(':')[1]?.trim();
      response.status = status || 'Unknown status';
    }

    const fileInfoLine = lines.find(line => line.includes('data: [info]'));

    if (fileInfoLine) {
      const info = fileInfoLine.split(':')[1]?.trim();
      response.fileInfo = info || 'File info not found';
    }

    if (Object.keys(response).length === 0) {
      response.error = 'No relevant data found in the response.';
    }

    return response;
  }
}

export default async function handler(req, res) {
  const ytdl = new YouTubeDL();
  const { url, type } = req.method === 'GET' ? req.query : req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const streamResponse = await ytdl.fetchStream(url, type);
    return res.status(200).json(streamResponse);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching stream' });
  }
}
