import axios from "axios";

const spotifyDL = {
  dl: async (link) => {
    const spotlink = /^https:\/\/open\.spotify\.com\/.+$/;
    if (!spotlink.test(link)) {
      return {
        success: false,
        message: "Link Spotify yang diinputkan tidak valid.",
      };
    }
    const url = `https://www.bhandarimilan.info.np/spotify?url=${encodeURIComponent(link)}`;
    const headers = {
      authority: "www.bhandarimilan.info.np",
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
    };
    try {
      const { data } = await axios.get(url, { headers });
      if (!data.success) {
        throw new Error(`Terjadi kesalahan saat mengekstrak link ${link}`);
      }

      const { id, artists, title, album, cover, isrc, releaseDate } =
        data.metadata;
      return {
        success: true,
        metadata: { id, artists, title, album, cover, isrc, releaseDate },
        link: data.link,
      };
    } catch (error) {
      console.error(error.message);
      return {
        success: false,
        message: `Tidak dapat mengekstrak link Spotify ${link}`,
      };
    }
  },

  play: async (query) => {
    const url = `https://www.bhandarimilan.info.np/spotisearch?query=${encodeURIComponent(query)}`;
    try {
      const { data } = await axios.get(url);
      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          message: `Pencarian ${query} tidak ditemukan.`,
        };
      }

      const ft = data[0];
      const dlinfo = await spotifyDL.dl(ft.link);
      return {
        success: true,
        name: ft.name,
        artist: ft.artist,
        release_date: ft.release_date,
        duration: ft.duration,
        link: ft.link,
        image_url: ft.image_url,
        dlink: dlinfo.link,
      };
    } catch (error) {
      console.error(error.message);
      return {
        success: false,
        message: `Tidak dapat menemukan pencarian ${query}`,
      };
    }
  },
};
export default async function handler(req, res) {
  const { url, type } = req.query;

  if (!(url || type))
    return res.status(400).json({ message: "No url, type provided" });

  const result =
    type && type === "dl" ? await spotifyDL.dl(url) : await spotifyDL.play(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
