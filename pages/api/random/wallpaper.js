import fetch from "node-fetch";
export default async function handler(req, res) {
  const imgSource = ["https://api.btstu.cn/sjbz/api.php?lx=1920x1080", "https://minimalistic-wallpaper.demolab.com/?random", "https://www.loremflickr.com/1920/1080", "https://www.picsum.photos/1920/1080"];
  try {
    const randomUrl = imgSource[Math.floor(Math.random() * imgSource.length)];
    const response = await fetch(randomUrl);
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).end(Buffer.from(buffer));
  } catch {
    res.status(500).end("Gagal mengambil wallpaper.");
  }
}