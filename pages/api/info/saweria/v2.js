import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
const SECRET_KEY = apiConfig.JWT_SECRET;
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
    this.commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
      "Content-Type": "application/json",
      Accept: "*/*",
      Origin: "https://saweria.co",
      Referer: "https://saweria.co/"
    };
  }
  _getHeaders() {
    const headers = {
      ...this.commonHeaders
    };
    if (this.token) {
      headers["Authorization"] = `${this.token}`;
    }
    return headers;
  }
  async getCaptchaToken() {
    const siteKey = "0x4AAAAAABdD0SArXy9tgW81";
    const url = "https://saweria.co/login";
    const captchaApiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token?sitekey=${siteKey}&url=${encodeURIComponent(url)}`;
    try {
      const response = await axios.get(captchaApiUrl);
      if (response.data && response.data.code === 200 && response.data.data && response.data.token) {
        return response.data.token;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
  async login(email, password) {
    try {
      const captcha_token = await this.getCaptchaToken();
      if (!captcha_token) {
        return {
          status: false,
          msg: "Gagal mendapatkan token captcha. Login dibatalkan."
        };
      }
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: email,
        password: password,
        captcha_token: captcha_token
      }, {
        headers: this._getHeaders()
      });
      const userData = response.data.data;
      const token = response.headers["authorization"];
      if (token) {
        this.token = token;
        if (userData && userData.id) {
          this.user_id = userData.id;
        }
        const sessionData = JSON.stringify({
          token: this.token,
          user_id: this.user_id
        });
        const encryptedSession = CryptoJS.AES.encrypt(sessionData, SECRET_KEY);
        const sessionHex = encryptedSession.toString(CryptoJS.enc.Hex);
        return {
          ...userData,
          token: this.token,
          user_id: this.user_id,
          session: sessionHex
        };
      } else {
        return {
          status: false,
          msg: "Gagal mendapatkan token dari header respons setelah login."
        };
      }
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat login",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async createQr(amount, msg = "Order") {
    try {
      if (!this.user_id) {
        return {
          status: false,
          msg: "ID Pengguna belum diatur. Harap login terlebih dahulu."
        };
      }
      const response = await axios.post(`${this.apiUrl}/donations/${this.user_id}`, {
        agree: true,
        amount: amount,
        customer_info: {
          first_name: "Payment",
          email: "gateway@nomisec07.tech"
        },
        message: msg,
        notUnderAge: true,
        payment_type: "qris"
      }, {
        headers: this._getHeaders()
      });
      return response.data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat membuat QR",
        error: e.response ? e.response.data : e.message
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
      return {
        rawHtml: data,
        message: msg
      };
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat memeriksa pembayaran",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async register(email) {
    try {
      const {
        data
      } = await axios.post(`${this.apiUrl}/auth/register`, {
        email: email,
        currency: "IDR"
      }, {
        headers: this._getHeaders()
      });
      return data;
    } catch (e) {
      return {
        success: false,
        data: "Terjadi kesalahan saat pendaftaran",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async getUser() {
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}/users`, {
        headers: this._getHeaders()
      });
      return data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mendapatkan pengguna",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async getSaweria(url) {
    try {
      if (!/saweria\.co\/\w+/gi.test(url)) throw new Error("URL tidak valid");
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data || "");
      const jsonData = JSON.parse($("script#__NEXT_DATA__").text().trim());
      return jsonData;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengambil halaman Saweria",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async setToken(token) {
    try {
      this.token = token;
      return {
        status: true,
        msg: "Token berhasil diatur."
      };
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengatur token",
        error: e.message
      };
    }
  }
  async setSaweria(username) {
    try {
      this.saweria = `${this.baseUrl}/${username}`;
      return {
        status: true,
        msg: "Nama pengguna Saweria berhasil diatur."
      };
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengatur Saweria",
        error: e.message
      };
    }
  }
  async createPayment(amount = 1e3, message = "hi") {
    try {
      const user = await this.getUser();
      if (!user || !user.id) {
        return {
          status: false,
          msg: "Pengguna tidak ditemukan atau ID hilang. Tidak dapat membuat pembayaran."
        };
      }
      const response = await axios.post(`${this.apiUrl}/donations/${user.id}`, {
        agree: true,
        amount: amount,
        currency: "IDR",
        customer_info: {
          first_name: user.username || "Anonymous",
          email: user.email || "anonymous@example.com",
          phone: ""
        },
        message: message,
        notUnderAge: true,
        payment_type: "qris",
        vote: ""
      }, {
        headers: this._getHeaders()
      });
      return response.data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat membuat pembayaran",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async sendPayment(url, amount = 1e3, message = "hi") {
    try {
      const pay = await this.getSaweria(url);
      if (!pay) {
        return {
          status: false,
          msg: "Gagal mendapatkan data halaman Saweria untuk mengirim pembayaran."
        };
      }
      return await this.createPayment(amount, message);
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengirim pembayaran",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async status(id) {
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}/donations/qris/${id}`, {
        headers: this._getHeaders()
      });
      return data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat memeriksa status pembayaran",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async getBalance() {
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}/donations/balance`, {
        headers: this._getHeaders()
      });
      return data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengambil saldo",
        error: e.response ? e.response.data : e.message
      };
    }
  }
  async getTransaction(page = 1) {
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}/transactions?page=${page}&page_size=15`, {
        headers: this._getHeaders()
      });
      return data;
    } catch (e) {
      return {
        status: false,
        msg: "Terjadi kesalahan saat mengambil transaksi",
        error: e.response ? e.response.data : e.message
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
      session
    } = params;
    let user_id = null;
    let token = null;
    if (action !== "login" && action !== "register") {
      if (!session) {
        return res.status(400).json({
          status: false,
          msg: "Paramenter 'session' diperlukan untuk tindakan ini."
        });
      }
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(session, SECRET_KEY);
        const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
        user_id = decryptedData.user_id;
        token = decryptedData.token;
      } catch (decryptError) {
        return res.status(400).json({
          status: false,
          msg: "Sesi tidak valid. Harap login kembali.",
          error: decryptError.message
        });
      }
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          msg: "Data sesi tidak lengkap. Harap login kembali."
        });
      }
    }
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
        if (!email || !password) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'email' dan 'password' diperlukan."
          });
        }
        const loginResponse = await saweria.login(email, password);
        if (loginResponse && loginResponse.status === false) {
          return res.status(401).json(loginResponse);
        }
        return res.status(200).json(loginResponse);
      case "create_qr":
        const {
          amount,
          msg = "Order"
        } = params;
        if (!amount) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'amount' diperlukan."
          });
        }
        const createQrResponse = await saweria.createQr(Number(amount), msg);
        if (createQrResponse.status === false) {
          return res.status(400).json(createQrResponse);
        }
        return res.status(200).json(createQrResponse);
      case "cek_pay":
        const {
          id
        } = params;
        if (!id) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'id' diperlukan."
          });
        }
        const cekPayResponse = await saweria.cekPay(id);
        if (cekPayResponse.status === false) {
          return res.status(500).json(cekPayResponse);
        }
        return res.status(200).json(cekPayResponse);
      case "register":
        const {
          email: reg_email
        } = params;
        if (!reg_email) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'email' diperlukan."
          });
        }
        const registerResponse = await saweria.register(reg_email);
        if (registerResponse.success === false) {
          return res.status(400).json(registerResponse);
        }
        return res.status(200).json(registerResponse);
      case "get_user":
        const getUserResponse = await saweria.getUser();
        if (getUserResponse.status === false) {
          return res.status(500).json(getUserResponse);
        }
        return res.status(200).json(getUserResponse);
      case "get_saweria":
        const {
          url
        } = params;
        if (!url) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'url' diperlukan."
          });
        }
        const getSaweriaResponse = await saweria.getSaweria(url);
        if (getSaweriaResponse.status === false) {
          return res.status(400).json(getSaweriaResponse);
        }
        return res.status(200).json(getSaweriaResponse);
      case "set_token":
        const {
          token: new_token
        } = params;
        if (!new_token) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'token' diperlukan."
          });
        }
        const setTokenResponse = await saweria.setToken(new_token);
        return res.status(200).json(setTokenResponse);
      case "set_saweria":
        const {
          username
        } = params;
        if (!username) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'username' diperlukan."
          });
        }
        const setSaweriaResponse = await saweria.setSaweria(username);
        return res.status(200).json(setSaweriaResponse);
      case "create_payment":
        const {
          amount: payment_amount,
            message
        } = params;
        if (!payment_amount) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'amount' diperlukan."
          });
        }
        const createPaymentResponse = await saweria.createPayment(Number(payment_amount), message);
        if (createPaymentResponse.status === false) {
          return res.status(400).json(createPaymentResponse);
        }
        return res.status(200).json(createPaymentResponse);
      case "send_payment":
        const {
          payment_url,
          pay_amount,
          pay_message
        } = params;
        if (!payment_url || !pay_amount || !pay_message) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'payment_url', 'pay_amount', dan 'pay_message' diperlukan."
          });
        }
        const sendPaymentResponse = await saweria.sendPayment(payment_url, Number(pay_amount), pay_message);
        if (sendPaymentResponse.status === false) {
          return res.status(400).json(sendPaymentResponse);
        }
        return res.status(200).json(sendPaymentResponse);
      case "status":
        const {
          transaction_id
        } = params;
        if (!transaction_id) {
          return res.status(400).json({
            status: false,
            msg: "Paramenter 'transaction_id' diperlukan."
          });
        }
        const statusResponse = await saweria.status(transaction_id);
        if (statusResponse.status === false) {
          return res.status(500).json(statusResponse);
        }
        return res.status(200).json(statusResponse);
      case "get_balance":
        const getBalanceResponse = await saweria.getBalance();
        if (getBalanceResponse.status === false) {
          return res.status(500).json(getBalanceResponse);
        }
        return res.status(200).json(getBalanceResponse);
      case "get_transaction":
        const {
          page
        } = params;
        const getTransactionResponse = await saweria.getTransaction(Number(page));
        if (getTransactionResponse.status === false) {
          return res.status(500).json(getTransactionResponse);
        }
        return res.status(200).json(getTransactionResponse);
      default:
        return res.status(400).json({
          status: false,
          msg: "Tindakan tidak valid."
        });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Terjadi kesalahan server",
      error: error.message
    });
  }
}