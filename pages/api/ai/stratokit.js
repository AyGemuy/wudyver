import dbConnect from '../../../lib/mongoose';
import StratokitAi from '../../../models/StratokitAi';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const parseResponse = (responseText) => {
  const lines = responseText.split('\n');
  const filtered = lines
    .filter(line => line.startsWith('0:'))
    .map(line => line.slice(2, -1).trim())
    .join('');
  return filtered;
};

const bufferFromBase64 = (inputText) => {
  const regex = /([A-Za-z0-9+/=]{10,})/g;
  const matches = inputText.match(regex);
  if (matches && matches.length > 0) {
    const base64Image = matches[0];
    const base64Data = base64Image.startsWith('data:image') ? base64Image.split(',')[1] : base64Image;
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer;
  } else {
    throw new Error('No base64 image found.');
  }
};

class StratokitAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      Referer: 'https://stratokit-app.pages.dev/ai/image',
    };
  }

  async handleRequest(action, query) {
    try {
      const { id = uuidv4(), clear = 'false', continueConv = 'false', prompt } = query;
      if (clear === 'true') {
        return await this.clearConversation(id);
      }
      if (action === 'image') {
        const imageBuffer = await this.fetchImage(prompt || 'Men');
        return { image: imageBuffer };
      }
      if (action === 'chat') {
        const chatResponse = await this.fetchChat(prompt || 'YOOO', continueConv === 'true', id);
        return { result: chatResponse };
      }
      throw new Error(`Unsupported action: ${action}`);
    } catch (error) {
      throw new Error(`Error handling request: ${error.message}`);
    }
  }

  async fetchImage(prompt) {
    try {
      const url = `${this.baseUrl}/ai/image`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Accept': 'text/x-component',
          'Next-Action': 'c52744193ba6de5b6fe15e8ba45e172bc673688f',
          'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22(dashboard)%22%2C%7B%22children%22%3A%5B%22ai%22%2C%7B%22children%22%3A%5B%22image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fai%2Fimage%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
        },
        body: JSON.stringify([{ prompt }]),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return bufferFromBase64(await response.text());
    } catch (error) {
      throw new Error(`Error fetching image: ${error.message}`);
    }
  }

  async fetchChat(prompt, isContinue, conversationId) {
    try {
      await dbConnect();
      const userMessage = { role: 'user', content: prompt };
      const conversation = await StratokitAi.findOneAndUpdate(
        { conversationId },
        { $push: { messages: userMessage } },
        { new: true, upsert: !isContinue },
      );
      const url = `${this.baseUrl}/api/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: conversation.messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const responseText = parseResponse(await response.text());
      const assistantMessage = { role: 'assistant', content: responseText };
      await StratokitAi.findOneAndUpdate(
        { conversationId },
        { $push: { messages: assistantMessage } },
      );

      return { conversationId: conversation.conversationId, messages: conversation.messages };
    } catch (error) {
      throw new Error(`Error fetching chat: ${error.message}`);
    }
  }

  async clearConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required to clear the conversation');
      }

      await dbConnect();
      await StratokitAi.deleteOne({ conversationId });

      return { message: 'Conversation cleared successfully' };
    } catch (error) {
      throw new Error(`Error clearing conversation: ${error.message}`);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed, use GET' });
  }

  const { action, ...query } = req.query;
  const stratokitApi = new StratokitAPI('https://stratokit-app.pages.dev');

  try {
    const result = await stratokitApi.handleRequest(action, query);

    if (result.image) {
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(result.image);
    }

    return res.status(200).json({ result: result.result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
