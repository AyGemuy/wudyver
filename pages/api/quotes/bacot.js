import fetch from "node-fetch";
async function quotesbacot() {
  try {
    const url = "https://raw.githubusercontent.com/orderku/db/main/dbbot/random/bacot.json";
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
    const bacotQuotes = await quotesbacot();
    if (bacotQuotes.length > 0) {
      const randomBacot = bacotQuotes[Math.floor(Math.random() * bacotQuotes.length)];
      return res.status(200).json({
        quote: randomBacot.result
      });
    } else {
      res.status(404).json({
        error: "No quotes found"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}