import axios from "axios";
class LineStickerDownloader {
  constructor() {}
  async main(url, platform = "android") {
    try {
      const packId = this.extractPackIdFromUrl(url);
      if (!packId) throw new Error("URL tidak valid atau ID paket tidak ditemukan.");
      const packMeta = await this.getPackMeta(packId, platform);
      if (!packMeta) throw new Error("Pack ID tidak valid.");
      const stickers = packMeta.stickers.map(sticker => sticker.id);
      const result = {
        packName: packMeta.title.en,
        author: packMeta.author.en,
        priceDetails: packMeta.price.map(p => ({
          country: p.country,
          currency: p.currency,
          price: p.price
        })),
        stickers: {
          animation: [],
          png: []
        }
      };
      const urls = await this.getStickerUrls(packId, stickers, platform);
      result.stickers = {
        ...result.stickers,
        ...urls
      };
      return {
        ...result,
        message: "Done!"
      };
    } catch (error) {
      return {
        message: error.message || "Terjadi kesalahan."
      };
    }
  }
  extractPackIdFromUrl(input) {
    const regex = /https:\/\/store\.line\.me\/stickershop\/product\/(\d+)(\/en)?/;
    const match = input.match(regex);
    if (match) {
      return match[1];
    }
    return input;
  }
  async getPackMeta(packId, platform) {
    try {
      const {
        data
      } = await axios.get(`http://dl.stickershop.line.naver.jp/products/0/0/1/${packId}/${platform}/productInfo.meta`);
      return data;
    } catch (error) {
      throw new Error("Gagal mengambil data meta.");
    }
  }
  async getStickerUrls(packId, stickers, platform) {
    const urls = stickers.reduce((acc, id) => {
      const animationBaseUrl = `https://sdl-stickershop.line.naver.jp/products/0/0/1/${packId}/${platform}/animation/${id}@2x.png`;
      const pngBaseUrl = `http://dl.stickershop.line.naver.jp/stickershop/v1/sticker/${id}/${platform}/sticker@2x.png`;
      acc.animation.push(animationBaseUrl);
      acc.png.push(pngBaseUrl);
      return acc;
    }, {
      png: [],
      animation: []
    });
    return {
      [platform]: {
        stickersZip: `https://stickershop.line-scdn.net/stickershop/v1/product/${packId}/${platform}/stickers.zip`,
        ...urls
      }
    };
  }
}
export default async function handler(req, res) {
  const {
    url,
    platform
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "URL diperlukan."
    });
  }
  try {
    const stickerDownloader = new LineStickerDownloader();
    const data = await stickerDownloader.main(url, platform || "android");
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Terjadi kesalahan."
    });
  }
}