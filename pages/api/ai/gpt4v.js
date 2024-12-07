import axios from 'axios';
import crypto from 'crypto';

export default async function handler(req, res) {
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const chatUuid = req.body?.chatUuid || req.query?.chatUuid || 'd4e7b199b7cee14a612aa0a30ebc4fc0';
  const prompt = req.body?.prompt || req.query?.prompt || 'Hello';
  const sendTime = req.body?.sendTime || req.query?.sendTime || new Date().toISOString();
  const firstQuestionFlag = req.body?.firstQuestionFlag ?? req.query?.firstQuestionFlag ?? true;
  const searchFlag = req.body?.searchFlag ?? req.query?.searchFlag ?? false;
  const language = req.body?.language || req.query?.language || 'en';

  if (req.method === 'POST') {
    return await processRequest(req, res, { uniqueId, chatUuid, prompt, sendTime, firstQuestionFlag, searchFlag, language });
  } else if (req.method === 'GET') {
    return await processRequest(req, res, { uniqueId, chatUuid, prompt, sendTime, firstQuestionFlag, searchFlag, language });
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function processRequest(req, res, { uniqueId, chatUuid, prompt, sendTime, firstQuestionFlag, searchFlag, language }) {
  const requestData = {
    prompt,
    chatUuid,
    sendTime,
    attachments: [],
    firstQuestionFlag: typeof firstQuestionFlag === 'string' ? firstQuestionFlag === 'true' : firstQuestionFlag,
    searchFlag: typeof searchFlag === 'string' ? searchFlag === 'true' : searchFlag,
    language,
  };

  try {
    const response = req.method === 'POST'
      ? await axios.post('https://gpt4vnet.erweima.ai/api/v1/chat/claude3/chat', requestData, {
          headers: {
            'Content-Type': 'application/json',
            authorization: '',
            uniqueId,
            verify: '',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            Referer: 'https://gpt4v.net/app/d4e7b199b7cee14a612aa0a30ebc4fc0',
          },
        })
      : await axios.get('https://gpt4vnet.erweima.ai/api/v1/chat/claude3/chat', {
          headers: {
            'Content-Type': 'application/json',
            authorization: '',
            uniqueId,
            verify: '',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            Referer: 'https://gpt4v.net/app/d4e7b199b7cee14a612aa0a30ebc4fc0',
          },
          params: requestData,
        });

    const fullMessage = response.data || '';
    if (fullMessage) {
      const parsedMessage = fullMessage
        .split('\n')
        .map(line => {
          try {
            return JSON.parse(line).data.message;
          } catch (error) {
            return '';
          }
        })
        .filter(line => line.trim() !== '')
        .join('');

      return res.status(200).json({
        success: true,
        data: {
          message: parsedMessage
        },
      });
    }

    res.status(200).json({ success: false, error: 'Unexpected response format', data: response.data });

  } catch (error) {
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
