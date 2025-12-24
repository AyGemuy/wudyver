import axios from "axios";
class Inboxes {
  constructor() {
    this.baseUrl = "https://inboxes.com/api/v2";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://inboxes.com",
        priority: "u=1, i",
        referer: "https://inboxes.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      if (config.method === "post" && config.url === "/inbox") {
        config.headers["Content-Type"] = "application/json";
        if (config.data === null || config.data === undefined) {
          config.data = {};
        }
        delete config.headers["content-length"];
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
  }
  async create() {
    try {
      const {
        data
      } = await this.client.post("/inbox", {});
      return data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async message({
    email
  }) {
    if (!email) {
      return {
        error: "Email address is required to get messages."
      };
    }
    try {
      const {
        data
      } = await this.client.get(`/inbox/${email}`, {
        headers: {
          authorization: "Bearer null"
        }
      });
      return data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!action) return res.status(400).json({
    error: "Action is required. Available actions: create, message"
  });
  try {
    const inboxes = new Inboxes();
    let result;
    switch (action) {
      case "create":
        result = await inboxes.create(params);
        break;
      case "message":
        result = await inboxes.message(params);
        break;
      default:
        return res.status(400).json({
          error: "Action is required. Available actions: create, message"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}