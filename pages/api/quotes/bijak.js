import fetch from 'node-fetch';

async function katabijak() {
  try {
    const url = 'https://raw.githubusercontent.com/onlybot12/galau/a3d5c0a37435a9c694c6b69e027385c1fd776df0/katabijak.json';
    let res = await fetch(url);
    return await res.text();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const quotes = await katabijak();
    if (quotes.length > 0) {
      const filteredQuotes = quotes
        .split("\n")
        .filter((_, index) => index !== 0 && index !== quotes.length - 1); // Menghapus garis pertama dan terakhir jika diperlukan
      const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)].slice(1, -2); // Mengambil quote secara acak dan membersihkan karakter yang tidak diinginkan
      
      res.status(200).json({ quote: randomQuote }); // Menyertakan quote yang terpilih dalam response
    } else {
      res.status(404).json({ error: 'No quotes found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
