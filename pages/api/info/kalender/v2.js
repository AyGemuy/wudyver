import axios from "axios";
export default async function handler(req, res) {
  try {
    const date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    });
    const currentDate = new Date(date);
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleString("en-US", {
      month: "long"
    });
    const day = currentDate.getDate();
    const calendarUrl = `https://s.wincalendar.net/img/en/calendar/${day}-${month.toLowerCase()}-${year}.png`;
    const response = await axios.get(calendarUrl, {
      responseType: "arraybuffer"
    });
    if (response.status !== 200) throw new Error("Gagal mengambil gambar kalender.");
    res.setHeader("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Gagal menghasilkan kalender."
    });
  }
}