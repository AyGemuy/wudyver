import axios from "axios";
import * as cheerio from "cheerio";
class Saweria {
  constructor({
    user_id,
    token
  }) {
    this.user_id = user_id;
    this.baseUrl = "https://saweria.co";
    this.apiUrl = "https://backend.saweria.co";
    this.token = token || "";
    this.saweria = "";
    this.headers = {
      host: "backend.saweria.co",
      "content-length": "55",
      "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-mobile": "?1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
      "content-type": "application/json",
      accept: "*/*",
      origin: "https://saweria.co",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://saweria.co/",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      ...this.token && {
        authorization: `Bearer ${this.token}`
      }
    };
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: this.headers
    });
  }
  async login(email, password) {
    try {
      const response = await this.axiosInstance.post("/auth/login", {
        email: email,
        password: password
      });
      const {
        data
      } = response;
      const token = response.headers["authorization"];
      if (token) {
        this.token = token;
        this.headers.authorization = `Bearer ${this.token}`;
        this.axiosInstance.defaults.headers = this.headers;
        return {
          status: true,
          token: token,
          ...data
        };
      } else {
        return {
          status: false,
          msg: "Failed to get token from response headers"
        };
      }
    } catch (e) {
      return {
        status: false,
        msg: "Error during login",
        error: e.message
      };
    }
  }
  async createQr(amount, msg = "Order") {
    try {
      const response = await this.axiosInstance.post(`/donations/${this.user_id}`, {
        agree: true,
        amount: amount,
        customer_info: {
          first_name: "Payment",
          email: "gateway@nomisec07.tech"
        },
        message: msg,
        notUnderAge: true,
        payment_type: "qris"
      });
      const {
        data
      } = response;
      return data ? {
        status: true,
        receipt: `${this.baseUrl}/qris/${data.id}`,
        url: `${this.baseUrl}/qris/${data.id}`,
        ...data
      } : {
        status: false,
        msg: "Failed to create payment"
      };
    } catch (e) {
      return {
        status: false,
        msg: "Error during QR creation",
        error: e.message
      };
    }
  }
  async cekPay(id) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/receipt/${id}`);
      const $ = cheerio.load(data || "");
      const msg = $("h2.chakra-heading.css-14dtuui").text();
      return data ? {
        status: true,
        msg: msg,
        url: `${this.baseUrl}/receipt/${id}`,
        data: data
      } : {
        status: false,
        msg: "PENDING",
        data: data
      };
    } catch (e) {
      return {
        status: false,
        msg: "Error during payment check",
        error: e.message
      };
    }
  }
  async register(email) {
    try {
      const {
        data
      } = await this.axiosInstance.post("/auth/register", {
        email: email,
        currency: "IDR"
      });
      return data ? {
        success: true,
        ...data
      } : {
        success: false,
        data: "Email Is Taken",
        email: email
      };
    } catch (e) {
      return {
        success: false,
        data: "Error during registration",
        error: e.message
      };
    }
  }
  async getUser() {
    try {
      const {
        data
      } = await this.axiosInstance.get("/users");
      return data ? data : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error getting user",
        error: e.message
      };
    }
  }
  async getSaweria(url) {
    try {
      if (!/saweria\.co\/\w+/gi.test(url)) throw new Error("Invalid URL");
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data || "");
      const jsonData = JSON.parse($("script#__NEXT_DATA__").text().trim());
      return data ? data : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error fetching Saweria page",
        error: e.message
      };
    }
  }
  async setToken(token) {
    try {
      this.token = token;
      this.headers.authorization = `Bearer ${token}`;
      this.axiosInstance.defaults.headers = this.headers;
    } catch (e) {
      return {
        status: false,
        msg: "Error setting token",
        error: e.message
      };
    }
  }
  async setSaweria(username) {
    try {
      this.saweria = `${this.baseUrl}/${username}`;
    } catch (e) {
      return {
        status: false,
        msg: "Error setting Saweria",
        error: e.message
      };
    }
  }
  async createPayment(amount = 1e3, message = "hi", token = this.token) {
    try {
      const user = await this.getUser();
      const response = await this.axiosInstance.post(`/donations/${user.id}`, {
        agree: true,
        amount: amount,
        currency: "IDR",
        customer_info: {
          first_name: user.username,
          email: user.email,
          phone: ""
        },
        message: message,
        notUnderage: true,
        payment_type: "qris",
        vote: ""
      });
      const {
        data
      } = response;
      return data ? {
        link: `${this.baseUrl}/qris/${data.data.id}`,
        ...data
      } : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error creating payment",
        error: e.message
      };
    }
  }
  async sendPayment(url, amount = 1e3, message = "hi") {
    try {
      const pay = await this.getSaweria(url);
      return await this.createPayment(amount, message, pay.id);
    } catch (e) {
      return {
        status: false,
        msg: "Error sending payment",
        error: e.message
      };
    }
  }
  async status(id) {
    try {
      const {
        data
      } = await this.axiosInstance.get(`/donations/qris/${id}`);
      return data ? {
        id: id,
        done: !data.qr_string,
        ...data
      } : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error checking payment status",
        error: e.message
      };
    }
  }
  async getBalance() {
    try {
      const {
        data
      } = await this.axiosInstance.get("/donations/balance");
      return data ? data : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error fetching balance",
        error: e.message
      };
    }
  }
  async getTransaction(page = 1) {
    try {
      const {
        data
      } = await this.axiosInstance.get(`/transactions?page=${page}&page_size=15`);
      return data ? data : {};
    } catch (e) {
      return {
        status: false,
        msg: "Error fetching transactions",
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const {
      user_id,
      token
    } = params;
    const saweria = new Saweria({
      user_id: user_id,
      token: token
    });
    switch (action) {
      case "login":
        const {
          email,
          password
        } = params;
        const loginResponse = await saweria.login(email, password);
        return res.status(200).json(loginResponse);
      case "createQr":
        const {
          amount,
          msg = "Order"
        } = params;
        const createQrResponse = await saweria.createQr(amount, msg);
        return res.status(200).json(createQrResponse);
      case "cekPay":
        const {
          id
        } = params;
        const cekPayResponse = await saweria.cekPay(id);
        return res.status(200).json(cekPayResponse);
      case "register":
        const {
          email: regEmail
        } = params;
        const registerResponse = await saweria.register(regEmail);
        return res.status(200).json(registerResponse);
      case "getUser":
        const getUserResponse = await saweria.getUser();
        return res.status(200).json(getUserResponse);
      case "getSaweria":
        const {
          url
        } = params;
        const getSaweriaResponse = await saweria.getSaweria(url);
        return res.status(200).json(getSaweriaResponse);
      case "setToken":
        const {
          token: newToken
        } = params;
        await saweria.setToken(newToken);
        return res.status(200).json({
          status: true,
          msg: "Token updated successfully"
        });
      case "setSaweria":
        const {
          username
        } = params;
        await saweria.setSaweria(username);
        return res.status(200).json({
          status: true,
          msg: `Saweria username set to ${username}`
        });
      case "createPayment":
        const {
          amount: paymentAmount,
            message
        } = params;
        const createPaymentResponse = await saweria.createPayment(paymentAmount, message);
        return res.status(200).json(createPaymentResponse);
      case "sendPayment":
        const {
          paymentUrl,
          payAmount,
          payMessage
        } = params;
        const sendPaymentResponse = await saweria.sendPayment(paymentUrl, payAmount, payMessage);
        return res.status(200).json(sendPaymentResponse);
      case "status":
        const {
          transactionId
        } = params;
        const statusResponse = await saweria.status(transactionId);
        return res.status(200).json(statusResponse);
      case "getBalance":
        const getBalanceResponse = await saweria.getBalance();
        return res.status(200).json(getBalanceResponse);
      case "getTransaction":
        const {
          page
        } = params;
        const getTransactionResponse = await saweria.getTransaction(page);
        return res.status(200).json(getTransactionResponse);
      default:
        return res.status(400).json({
          status: false,
          msg: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Server error",
      error: error.message
    });
  }
}