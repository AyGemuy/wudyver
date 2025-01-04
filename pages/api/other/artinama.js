import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    nama
  } = req.method === "GET" ? req.query : req.body;
  if (!nama) {
    return res.status(400).json({
      error: "Nama parameter is required"
    });
  }
  try {
    const url = `https://cekartinama.com/cari-arti-nama/${encodeURIComponent(nama)}.html`;
    const response = await fetch(url);
    const body = await response.text();
    const regex = /<br>Nama yang Anda cari yaitu(.*?)<div align="center">\s*<!-- Sharingbutton Facebook -->/s;
    const match = body.match(regex);
    if (match && match[1]) {
      let description = match[1].trim();
      description = description.replace(/<br\s*\/?>/g, "\n");
      description = description.replace(/<\/?[^>]+(>|$)/g, "").trim();
      return res.status(200).json({
        result: description
      });
    } else {
      return res.status(404).json({
        result: "No description found."
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Error fetching data"
    });
  }
}