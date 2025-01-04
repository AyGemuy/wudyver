import axios from 'axios';

class HixChat {
  constructor() {
    this.baseUrl = 'https://chat.hix.ai/api/hix/chat';
    this.headers = {
      'accept': '*/*',
      'accept-language': 'id-ID,id;q=0.9',
      'baggage': 'sentry-environment=production,sentry-release=89bac6aa5b5a53e693fc75fac1d1fcb5c11e43b0,sentry-public_key=282aa94d95bfd3d55e04c66dc853ef4f,sentry-trace_id=7239336f00eb477490c01744cd5044ec,sentry-sample_rate=1,sentry-sampled=true',
      'content-type': 'application/json',
      'cookie': 'user_group=117; __Host-next-auth.csrf-token=954995a498addec32ea0af79d4362f84214484cb5caf5af09a14344f75cf636a%7Cd277de92d911f41ab07f9bc679effb7bfeb21d1017ba7f84a02d6d08c0a3be94; first-visit-url=https%3A%2F%2Fchat.hix.ai%2F%3F; cc_cookie=%7B%22categories%22%3A%5B%22necessary%22%2C%22functional%22%2C%22analytics%22%2C%22advertisement%22%5D%2C%22revision%22%3A0%2C%22data%22%3Anull%2C%22consentTimestamp%22%3A%222025-01-01T07%3A34%3A58.963Z%22%2C%22consentId%22%3A%22b5b97425-c91e-41a6-828e-a0504f76c1b7%22%2C%22services%22%3A%7B%22necessary%22%3A%5B%5D%2C%22functional%22%3A%5B%5D%2C%22analytics%22%3A%5B%5D%2C%22advertisement%22%3A%5B%5D%7D%2C%22lastConsentTimestamp%22%3A%222025-01-01T07%3A34%3A58.963Z%22%2C%22expirationTime%22%3A1751441698964%7D; device-id=b1b39c6436bb5e8d23a32e270780d8ab; cf_clearance=8QF2zxTqVzvilT5xjZEFpizFtkNiR3gfDuiEx9.jRNw-1735716915-1.2.1.1-y8P8yYiQHGRttvz6vrwv0sRwPvGnDEb8TKAmKqAK27dbxh5.colGNslJAiSCPi6tuTWecss0di5tAmzxLbZvpH1NtC.B1id68_As5gPndIkeg5Pmr2d0pKAg2LRKoBKJNI7HixqTSqVQSLYukSRJ9CGl1jPypFjxhxg1Vi8AIzwrmAW2xPbFqmKvs.twm6TUkS955kt_ioxM.9gW1dgwEQYvvG7QAdKB6.Fbio4MVXFKDWpNNj0a6Av4uZBAWrnalA4rv9jrwcrPG2F2qEQbHAA9FOIv0Riavr2mba3HpkghQ23ZUuGE2HmbUyjBeVqEjfH2j0Dt53GHwowT_H2a2uVu_s1iMimiB6E_8dy_cFCTx9GcBSKDc0lWZzepagiIIEbELFRmNjXgP_m.pS.nzw; __Secure-next-auth.callback-url=https%3A%2F%2Fchat.hix.ai%2F%3F; _gcl_au=1.1.1964744265.1735716919.1735716919; _ga=GA1.1.1473211808.1735716922; FPID=FPID2.2.6CBRz69EMBH3OJJq%2Bu18GC3Omhf%2FRAucybVTgAqUiks%3D.1735716922; FPLC=e7rP2RxHpxf%2BA5p6P4b94re8z0N4TUP7KZXdeV1CLqU6BvyfmuB%2BxDKp7KsRv%2Fyueh82Tcj%2F0jNLAYLp837Vq1TrCN%2BbXTirxteq3dZv3sdiTfWjG7bgljNg49eWAw%3D%3D; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..flzRSCwyYQX9IE-r.YqWC33oMR1ptOCrjRi6d4X2cwsxtiyiMLEoBwHpkHLFALM7vAp8QXx8NMjkGuXHBTR_dVD-fnt8iW-jgwd0TH6pmiq92nZsKGdbcVyBavPU0ECXRvuCgQxV4PFBqmCTHbqif9RGTOb_6g9c8YDC7iJxewsEizpOw7BP03cqw1JR_Ricxg9VR7PFmKzrHbTOIl3Q1htzv74XnAGTE9UYegXEKSlGmvzPxzIACL9iXKA1515iSC0lNNuCo7c_hZjHKjnSF2MJSm3OPDx4t-gX0dCgJKp5NfI6Zyar49J7SDTul2tQRUheWbxz54b0-iuq_cDPpTprzDPe5oY6gRIqPRZE9prFZ-XZ6BChkYx_4bQ4BZME9pnd6mK3y01qTTm7sJYkXJRyUiqheZTZHgirhfkC67vFWe9b04w.dfHOp8nS6u23R3FCznIhEQ',
      'origin': 'https://chat.hix.ai',
      'priority': 'u=1, i',
      'referer': 'https://chat.hix.ai/chatgpt',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sentry-trace': '91849ee34e9748f09af64c1fa331d0b3-aab81e694431221b-1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    };
  }
  parseResponse(data) {
    const filteredData = data.split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => {
        try {
          const parsedData = JSON.parse(line.slice(5));
          return parsedData.content || '';
        } catch (e) {
          console.error('Error parsing JSON:', e);
          return '';
        }
      });

    const combinedContent = filteredData.join('');

    return combinedContent;
  }
  
  async chat(question, chatId = "cm5dl3ptm0aooah26hkwmcr2o") {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          chatId: chatId,
          question: question,
          fileUrl: '',
          answer: '',
          relatedQuestions: []
        },
        {
          headers: this.headers
        }
      );
      return this.parseResponse(response.data);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    const {
    prompt,
    chatId
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
    const hixChat = new HixChat();

    try {
      const data = await hixChat.chat(prompt, chatId);

      return res.status(200).json({
        success: true,
        result: data,
      });
    } catch (error) {
      console.error("Error in handler:", error);
      return res.status(500).json({
        error: "Failed to process the request",
        details: error.message,
      });
    }
  } else {
    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["GET", "POST"],
    });
  }
}
