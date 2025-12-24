import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const getRandomAyah = () => Math.floor(Math.random() * 6236) + 1;
    const src = await fetch(`https://api.alquran.cloud/v1/ayah/${getRandomAyah()}/ar.alafasy`);
    const json = await src.json();
    if (json && json.data) {
      return res.status(200).json(json.data);
    } else {
      throw new Error("Data tidak ditemukan");
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}