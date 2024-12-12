import fetch from "node-fetch";

export default async function handler(req, res) {
  const { emoji } = req.query;

  // Validasi parameter
  if (!emoji || !emoji.includes("_")) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'emoji' is required and should be in the format 'a_b'.",
    });
  }

  const [a, b] = emoji.split("_");

  try {
    // Request ke Tenor API
    const response = await fetch(
      `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(
        a
      )}_${encodeURIComponent(b)}`
    );

    if (!response.ok) {
      throw new Error(`Tenor API returned status ${response.status}`);
    }

    const data = await response.json();

    // Ambil URL gambar pertama
    const stickerUrl = data?.results?.[0]?.media_formats?.png_transparent?.url;

    if (!stickerUrl) {
      return res.status(404).json({
        success: false,
        message: "No sticker found for the given emoji combination.",
      });
    }

    // Fetch gambar dari URL sticker
    const stickerResponse = await fetch(stickerUrl);

    if (!stickerResponse.ok) {
      throw new Error(`Failed to fetch sticker image: ${stickerResponse.status}`);
    }

    const imageBuffer = await stickerResponse.arrayBuffer();

    // Set header respons untuk gambar
    res.setHeader("Content-Type", "image/png");

    // Kirim gambar langsung
    return res.status(200).end(imageBuffer);
  } catch (error) {
    console.error("Error processing makerMix:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
