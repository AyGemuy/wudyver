import fetch from 'node-fetch';
import dbConnect from '../../../lib/mongoose';
import EqingChatHistory from '../../../models/EqingChatHistory';

class Eqing {
  async token() {
    try {
      const response = await fetch('https://chat.eqing.tech/api/altcaptcha/challenge');
      if (!response.ok) throw new Error('Failed to fetch captcha');
      return await response.json();
    } catch (error) {
      console.error('Error fetching captcha token:', error);
      throw error;
    }
  }

  async create(captchaToken, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, messages, stream) {
    const chatData = {
      messages,
      stream: stream || false,
      model,
      temperature,
      presence_penalty,
      frequency_penalty,
      top_p,
      chat_token,
      captchaToken,
    };

    try {
      const response = await fetch('https://chat.eqing.tech/api/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'x-guest-id': 'b2kl1QAfu2PzysWPMFbYx',
          'accept': 'text/event-stream',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://chat.eqing.tech/#/chat',
        },
        body: JSON.stringify(chatData),
      });

      if (!response.ok) throw new Error('Failed to send chat message');
      
      const data = await response.text();
      return data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  async chat(model, system, temperature, top_p, presence_penalty, frequency_penalty, chat_token, captchaToken, prompt, stream, history) {
    try {
      const captchaData = await this.token();
      console.log('Captcha token fetched:', captchaData);
      return await this.create(captchaData.salt, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, history, stream);
    } catch (error) {
      console.error('Error in chat method:', error);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  const { model = 'gpt-4o-mini', temp: temperature = 0.5, top: top_p = 1, presence: presence_penalty = 0, frequency: frequency_penalty = 0, token: chat_token = 64, captcha: captchaToken = '', prompt = 'Hy', stream = false, system, action, id, continue: continueChat } = req.query;

  await dbConnect();

  if (req.method === 'GET') {
    try {
      console.log('Received request to process chat');
      const eqing = new Eqing();
      let chatResponse;
      let chatHistory = await EqingChatHistory.findOne({ _id: id });
      let history = chatHistory ? chatHistory.history : [];

      if (action === 'create') {
        console.log('Creating new chat...');
        if (continueChat === 'true' && history.length > 0) {
          history.push({ role: 'user', content: prompt });
        } else if (continueChat !== 'true') {
          history = [{ role: 'user', content: prompt }];
        }

        await EqingChatHistory.findOneAndUpdate(
          { _id: id },
          { $set: { history } },
          { new: true, upsert: true }
        );

        chatResponse = await eqing.chat(model, system, parseFloat(temperature), parseFloat(top_p), parseFloat(presence_penalty), parseFloat(frequency_penalty), parseInt(chat_token), captchaToken, prompt, stream === 'true', history);

      } else if (action === 'chat') {
        console.log('Continuing chat...');
        if (continueChat === 'true' && chatHistory) {
          history.push({ role: 'user', content: prompt });
          await EqingChatHistory.findOneAndUpdate(
            { _id: id },
            { $set: { history } },
            { new: true }
          );
        } else if (continueChat !== 'true') {
          history = [{ role: 'user', content: prompt }];
          await EqingChatHistory.findOneAndUpdate(
            { _id: id },
            { $set: { history } },
            { new: true }
          );
        }

        chatResponse = await eqing.chat(model, system, parseFloat(temperature), parseFloat(top_p), parseFloat(presence_penalty), parseFloat(frequency_penalty), parseInt(chat_token), captchaToken, prompt, stream === 'true', history);

        const assistantMessage = { role: 'assistant', content: chatResponse };
        await EqingChatHistory.findOneAndUpdate(
          { _id: id },
          { $push: { history: assistantMessage } },
          { new: true }
        );
      }

      console.log('Chat response:', chatResponse);
      return res.status(200).json({ result: chatResponse });
    } catch (error) {
      console.error('Error processing chat request:', error);
      return res.status(500).json({ error: 'Failed to process chat request', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
