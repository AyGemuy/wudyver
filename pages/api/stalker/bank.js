import axios from "axios";
class BankStalker {
  async getList() {
    try {
      const {
        data
      } = await axios.get("https://cek-rekening-three.vercel.app/api/list-bank");
      return data.data;
    } catch (error) {
      console.error("Failed to fetch list of banks", error);
      throw new Error("Unable to fetch bank list");
    }
  }
  async checkBank(rekening, bankType) {
    if (!rekening) throw new Error("Mohon Masukkan Rekening Atau Nomor Bank");
    const listBank = await this.getList();
    const bank = listBank.find(b => b.bank_code === bankType);
    if (!bank) {
      console.log(`Bank Type tidak valid! Berikut daftar bank yang tersedia:\n${listBank.map(b => `${b.bank_code} - ${b.name}`).join("\n")}`);
      throw new Error("Invalid bank type");
    }
    try {
      const {
        data: cek
      } = await axios.get(`https://cek-rekening-three.vercel.app/api/cek-rekening?bank_code=${bankType}&number=${rekening}`);
      return cek;
    } catch (errors) {
      console.warn("[ WARNING ] Errors Found! " + errors.message);
      throw errors;
    }
  }
}
export default async function handler(req, res) {
  const {
    rekening,
    bankType = "gopay"
  } = req.method === "GET" ? req.query : req.body;
  if (!rekening || !bankType) {
    return res.status(400).json({
      error: "Rekening and bankType are required"
    });
  }
  const bankStalker = new BankStalker();
  try {
    const result = await bankStalker.checkBank(rekening, bankType);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}