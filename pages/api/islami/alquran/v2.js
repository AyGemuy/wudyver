import fetch from "node-fetch";
class QuranID {
  async getData(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.json();
    } catch (error) {
      console.error("There was a problem with the fetch operation:", error);
      throw error;
    }
  }
  async All() {
    return await this.getData("https://quran-api-id.vercel.app/surahs");
  }
  async Specific(surahNumber) {
    return await this.getData(`https://quran-api-id.vercel.app/surahs/${surahNumber}`);
  }
  async Ayahs(surahNumber) {
    return await this.getData(`https://quran-api-id.vercel.app/surahs/${surahNumber}/ayahs`);
  }
  async SpecificAyah(surahNumber, ayahNumber) {
    return await this.getData(`https://quran-api-id.vercel.app/surahs/${surahNumber}/ayahs/${ayahNumber}`);
  }
  async Random() {
    return await this.getData("https://quran-api-id.vercel.app/random");
  }
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  const quran = new QuranID();
  if (method === "GET") {
    const {
      action,
      surah: surahNumber,
      ayah: ayahNumber
    } = query;
    try {
      let result;
      if (action === "all") {
        result = await quran.All();
      } else if (action === "specific" && surahNumber) {
        result = await quran.Specific(surahNumber);
      } else if (action === "ayahs" && surahNumber) {
        result = await quran.Ayahs(surahNumber);
      } else if (action === "specificAyah" && surahNumber && ayahNumber) {
        result = await quran.SpecificAyah(surahNumber, ayahNumber);
      } else if (action === "random") {
        result = await quran.Random();
      } else {
        return res.status(400).json({
          error: "Invalid action or missing parameters"
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error handling request:", error);
      return res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}