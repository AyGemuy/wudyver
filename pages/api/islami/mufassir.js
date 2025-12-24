import fetch from "node-fetch";
const API_BASE_URL = "https://hadits.e-mufassir.com/api";
const getHaditsByKitab = async (kitabId, page = 1) => {
  try {
    const response = await fetch(`${API_BASE_URL}/hadits/by_id/${kitabId}?pagination=true&limit=5&page=${page}`);
    const data = await response.json();
    if (!data.data.list_hadits) throw new Error(data.message);
    return data.data.list_hadits;
  } catch (error) {
    throw new Error("Gagal mengambil hadits.");
  }
};
export default async function handler(req, res) {
  const {
    kitabId,
    page
  } = req.method === "GET" ? req.query : req.body;
  if (!kitabId) {
    return res.status(400).json({
      error: "Paramenter kitabId wajib diisi"
    });
  }
  try {
    const haditsList = await getHaditsByKitab(kitabId, page || 1);
    return res.status(200).json(haditsList);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}