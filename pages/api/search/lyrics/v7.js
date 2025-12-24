import axios from "axios";
class Lyrics {
  async search(query) {
    const baseUrl = `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`;
    try {
      const response = await axios.get(baseUrl);
      const songs = response.data?.data || [];
      return songs.map(song => ({
        id: song.id,
        title: this.toSlug(song.title),
        title_short: song.title_short,
        artist: {
          name: this.toSlug(song.artist.name),
          link: song.artist.link,
          picture: song.artist.picture
        },
        album: {
          title: song.album.title,
          cover: song.album.cover
        },
        duration: song.duration,
        preview: song.preview,
        explicit_lyrics: song.explicit_lyrics,
        rank: song.rank
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
  async lyrics(artist, title) {
    const artistSlug = this.toSlug(artist);
    const titleSlug = this.toSlug(title);
    try {
      const response = await axios.get(`https://api.lyrics.ovh/v1/${artistSlug}/${titleSlug}`);
      return response.data?.lyrics || "Lyrics not found.";
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return "Error fetching lyrics.";
    }
  }
  toSlug(text) {
    return text.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    artist,
    title
  } = req.method === "GET" ? req.query : req.body;
  const lirik = new Lyrics();
  try {
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search."
          });
        }
        const songs = await lirik.search(query);
        return res.status(200).json({
          result: songs
        });
      case "lyrics":
        if (!(artist && title)) {
          return res.status(400).json({
            error: "Artist and title parameters are required for lyrics."
          });
        }
        const lyrics = await lirik.lyrics(artist, title);
        return res.status(200).json({
          result: lyrics
        });
      default:
        if (query) {
          const searchResults = await lirik.search(query);
          if (searchResults.length === 0) {
            return res.status(404).json({
              error: "No songs found."
            });
          }
          const firstSong = searchResults[0];
          const songLyrics = await lirik.lyrics(firstSong?.artist?.name, firstSong?.title);
          return res.status(200).json({
            song: firstSong,
            lyrics: songLyrics
          });
        }
        return res.status(400).json({
          error: "Invalid request. Provide an action, query, or valid parameters."
        });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    return res.status(500).json({
      error: "Internal Server Error."
    });
  }
}