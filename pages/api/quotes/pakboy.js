import fetch from "node-fetch";
async function pantunpakboy() {
  try {
    const url = "https://raw.githubusercontent.com/orderku/db/main/dbbot/random/pantunpakboy.json";
    let res = await fetch(url);
    let data = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
export default async function handler(req, res) {
  try {
    const pantun = await pantunpakboy();
    if (pantun.length > 0) {
      const randomPantun = pantun[Math.floor(Math.random() * pantun.length)];
      return res.status(200).json({
        quote: randomPantun.result
      });
    } else {
      res.status(404).json({
        error: "No pantun found"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}