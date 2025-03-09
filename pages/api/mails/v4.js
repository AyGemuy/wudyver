import axios from 'axios';

class TempEmail {
  constructor(proxy = null, timeout = 15000) {
    this.session = axios.create({
      baseURL: 'https://api.mail.tm',
      headers: { 'Content-Type': 'application/json' },
      timeout: timeout,
      proxy: proxy ? { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } : null,
    });
    this.baseUrl = 'https://api.mail.tm';
  }

  async getDomains() {
    try {
      const response = await this.session.get('/domains');
      return response.data['hydra:member'].map(item => item.domain);
    } catch (error) {
      console.error('Error fetching domains:', error);
      return [];
    }
  }

  async getMail(name = this.randomString(15), password = null, domain = null) {
    const mail = `${name}@${domain || (await this.getDomains())[0]}`;
    try {
      const response = await this.session.post('/accounts', {
        address: mail,
        password: mail,
      });

      if (response.status === 201) {
        const tokenResponse = await this.session.post('/token', {
          address: mail,
          password: password || mail,
        });
        const token = tokenResponse.data.token;
        this.session.defaults.headers['Authorization'] = `Bearer ${token}`;
        return mail;
      }
    } catch (error) {
      console.error('Error creating email:', error);
      return 'Email creation error.';
    }
  }

  async fetchInbox() {
    try {
      const response = await this.session.get('/messages');
      return response.data['hydra:member'];
    } catch (error) {
      console.error('Error fetching inbox:', error);
      return [];
    }
  }

  async getMessage(messageId) {
    try {
      const response = await this.session.get(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching message:', error);
      return null;
    }
  }

  async getMessageContent(messageId) {
    try {
      const message = await this.getMessage(messageId);
      return message ? message.text : null;
    } catch (error) {
      console.error('Error fetching message content:', error);
      return null;
    }
  }

  randomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async getTokenFromEmail(email, password) {
    try {
      const tokenResponse = await this.session.post('/token', {
        address: email,
        password: password || email,
      });
      return tokenResponse.data.token;
    } catch (error) {
      console.error('Error generating token:', error);
      return null;
    }
  }
}

export default async function handler(req, res) {
  const { action, email, name, password, domain, messageId } = req.method === "GET" ? req.query : req.body;
  const tempEmail = new TempEmail();

  try {
    switch (action) {
      case 'create':
        if (!name) {
          const createdEmail = await tempEmail.getMail(name, password, domain);
          return res.status(200).json({ message: 'Email created successfully', email: createdEmail });
        }
        return res.status(400).json({ message: 'Email creation requires no email parameter.' });

      case 'message':
        if (email) {
          const token = await tempEmail.getTokenFromEmail(email, password);
          if (token) {
            tempEmail.session.defaults.headers['Authorization'] = `Bearer ${token}`;
            const content = messageId
              ? await tempEmail.getMessageContent(messageId)
              : await tempEmail.fetchInbox();
            return res.status(200).json({ message: messageId ? 'Message fetched successfully' : 'Inbox fetched successfully', content });
          }
          return res.status(400).json({ message: 'Invalid email or password for token generation.' });
        }
        return res.status(400).json({ message: 'Email is required to fetch messages or inbox.' });

      default:
        return res.status(400).json({ message: 'Invalid action. Use create or message.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error occurred', error: error.message });
  }
}
