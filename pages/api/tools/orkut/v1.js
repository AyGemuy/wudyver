import axios from "axios";
import FormData from "form-data";
import QRCode from "qrcode";
import {
  v4 as uuidv4
} from "uuid";
import apiConfig from "@/configs/apiConfig";
const creator = apiConfig.DOMAIN_URL;
class OrkutApi {
  constructor() {
    this.creator = creator;
  }
  _convertCRC16(str) {
    let crc = 65535;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
      crc ^= str.charCodeAt(c) << 8;
      for (let i = 0; i < 8; i++) {
        if (crc & 32768) {
          crc = crc << 1 ^ 4129;
        } else {
          crc = crc << 1;
        }
      }
    }
    let hex = crc & 65535;
    hex = ("000" + hex.toString(16).toUpperCase()).slice(-4);
    return hex;
  }
  _generateTransactionId() {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return "QR-" + randomPart;
  }
  _generateExpirationTime() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    return expirationTime;
  }
  async _createQRIS(amount, codeqr) {
    try {
      let qrisData = codeqr.slice(0, -4);
      const step1 = qrisData.replace("010211", "010212");
      const step2 = step1.split("5802ID");
      amount = amount.toString();
      let uang = "54" + ("0" + amount.length).slice(-2) + amount;
      uang += "5802ID";
      const rawQRString = step2[0] + uang + step2[1] + this._convertCRC16(step2[0] + uang + step2[1]);
      const qrDataUri = await QRCode.toDataURL(rawQRString);
      return {
        transactionId: this._generateTransactionId(),
        amount: amount,
        expirationTime: this._generateExpirationTime(),
        qrImageUrl: qrDataUri
      };
    } catch (error) {
      console.error("Error generating QR code:", error);
      throw new Error("Gagal membuat kode QR.");
    }
  }
  async _uploadQR(qrDataUri) {
    try {
      const base64Data = qrDataUri.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "qrcode.png",
        contentType: "image/png"
      });
      const response = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/upload`, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      if (response.data && response.data.result) {
        return response.data.result;
      } else {
        throw new Error("Struktur respons tidak valid dari layanan unggah.");
      }
    } catch (error) {
      console.error(`Gagal mengunggah QR code ke ${apiConfig.DOMAIN_URL}:`, error.message);
      return null;
    }
  }
  async deposit({
    amount,
    qrcode
  }) {
    const qrData = await this._createQRIS(amount, qrcode);
    const uploadedQrUrl = await this._uploadQR(qrData.qrImageUrl);
    return {
      status: true,
      creator: this.creator,
      transactionId: qrData.transactionId,
      amount: qrData.amount,
      expirationTime: qrData.expirationTime,
      qrImageUrl: uploadedQrUrl,
      qrDataUri: qrData.qrImageUrl
    };
  }
  async status({
    merchant,
    keyorkut
  }) {
    try {
      const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
      const response = await axios.get(url);
      if (!response.data || response.data.status !== "success") {
        throw new Error("Gagal mengambil data transaksi dari gateway.");
      }
      const transactions = response.data.data;
      if (transactions.length === 0) {
        return {
          status: true,
          creator: this.creator,
          message: "Belum ada transaksi terbaru."
        };
      }
      return {
        status: true,
        creator: this.creator,
        latestTransaction: transactions[0]
      };
    } catch (error) {
      console.error("Error fetching latest payment:", error);
      throw new Error("Terjadi kesalahan saat mengecek transaksi terbaru.");
    }
  }
  async mutasi({
    merchant,
    keyorkut
  }) {
    try {
      const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
      const response = await axios.get(url);
      if (!response.data || response.data.status !== "success") {
        throw new Error("Gagal mengambil data mutasi dari gateway.");
      }
      const transactions = response.data.data;
      if (transactions.length === 0) {
        return {
          status: true,
          creator: this.creator,
          message: "Tidak ada transaksi ditemukan."
        };
      }
      return {
        status: true,
        creator: this.creator,
        transactions: transactions
      };
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw new Error("Terjadi kesalahan saat mengecek mutasi.");
    }
  }
  async saldoqr({
    merchant,
    keyorkut
  }) {
    try {
      const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
      const response = await axios.get(url);
      if (!response.data || response.data.status !== "success") {
        throw new Error("Gagal mengambil data saldo dari gateway.");
      }
      const transactions = response.data.data;
      if (transactions.length === 0) {
        return {
          status: true,
          creator: this.creator,
          message: "Saldo tidak tersedia (tidak ada riwayat transaksi)."
        };
      }
      return {
        status: true,
        creator: this.creator,
        balance: transactions[0].balance
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw new Error("Terjadi kesalahan saat mengecek saldo.");
    }
  }
}
const availableActions = {
  deposit: ["amount", "qrcode"],
  status: [],
  mutasi: [],
  saldoqr: []
};
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action
  } = params;
  const DEFAULT_KEYORKUT = "611082517384237019863470KCT7FF7D7059AD0FD10DF40D93B7A6F6304";
  const DEFAULT_MERCHANT = "OK1986347";
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      available_actions: Object.keys(availableActions)
    });
  }
  const actionsWithDefaults = ["status", "mutasi", "saldoqr"];
  if (actionsWithDefaults.includes(action)) {
    if (!params.keyorkut) {
      params.keyorkut = DEFAULT_KEYORKUT;
    }
    if (!params.merchant) {
      params.merchant = DEFAULT_MERCHANT;
    }
  }
  const requiredParams = availableActions[action];
  if (requiredParams === undefined) {
    return res.status(400).json({
      error: `Action tidak valid: '${action}'`,
      available_actions: Object.keys(availableActions)
    });
  }
  for (const param of requiredParams) {
    if (!params[param]) {
      return res.status(400).json({
        status: false,
        creator: creator,
        error: `Parameter '${param}' wajib diisi untuk action '${action}'.`
      });
    }
  }
  const api = new OrkutApi();
  try {
    let result;
    switch (action) {
      case "deposit":
        result = await api.deposit(params);
        break;
      case "status":
        result = await api.status(params);
        break;
      case "mutasi":
        result = await api.mutasi(params);
        break;
      case "saldoqr":
        result = await api.saldoqr(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: '${action}'`,
          available_actions: Object.keys(availableActions)
        });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(`Handler error for action '${action}':`, err);
    return res.status(500).json({
      status: false,
      creator: creator,
      error: err.message || "Terjadi kesalahan pada server.",
      action: action
    });
  }
}