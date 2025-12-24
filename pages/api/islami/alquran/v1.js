import fetch from "node-fetch";
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
  }
}
async function getAyahData(ayah, edition) {
  const ayahUrl = `https://api.alquran.cloud/v1/ayah/${ayah}/${edition}`;
  return await fetchJson(ayahUrl);
}
async function getSurahData(surah, edition) {
  const surahUrl = `https://api.alquran.cloud/v1/surah/${surah}/${edition}`;
  return await fetchJson(surahUrl);
}

function getImageUrl(surah, ayah) {
  return `https://cdn.islamic.network/quran/images/high-resolution/${surah}_${ayah}.png`;
}

function getAudioUrl(edition, number) {
  return `https://cdn.islamic.network/quran/audio-surah/128/${edition}/${number}.mp3`;
}
export default async function handler(req, res) {
  const {
    ayah,
    surah,
    edition = "quran-simple"
  } = req.method === "GET" ? req.query : req.body;
  if (!ayah && !surah) return res.status(400).json({
    error: "Paramenter 'ayah' atau 'surah' wajib diisi."
  });
  try {
    if (ayah) {
      const ayahData = await getAyahData(ayah, edition);
      return res.status(200).json(ayahData);
    } else if (surah) {
      const surahData = await getSurahData(surah, edition);
      const additionalData = surahData.data.ayahs.map(ayah => ({
        ayahNumber: ayah.numberInSurah,
        imageUrl: getImageUrl(surah, ayah.numberInSurah),
        audioUrl: getAudioUrl(edition, ayah.number)
      }));
      return res.status(200).json({
        ...surahData,
        additionalData: additionalData
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}