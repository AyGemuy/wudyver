import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    query,
    method
  } = req;
  const {
    userId,
    zoneId
  } = query;
  if (!userId || !zoneId) {
    return res.status(400).json({
      result: null,
      error: "User ID dan Zone ID harus disediakan"
    });
  }
  const url = `https://id-game-checker.p.rapidapi.com/mobile-legends/${userId}/${zoneId}`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "3144ba9be2msh006f63520665a33p15e041jsnf441c167da6c",
      "X-RapidAPI-Host": "id-game-checker.p.rapidapi.com"
    }
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data.success ? res.status(200).json({
      result: data
    }) : res.status(400).json({
      result: null,
      error: "Gagal mendapatkan data. Pastikan ID dan Zone ID valid."
    });
  } catch {
    return res.status(500).json({
      result: null,
      error: "Terjadi kesalahan saat mengambil data."
    });
  }
}