import fetch from "node-fetch";
class TeraboxHnn {
  async getInfo(inputUrl) {
    try {
      const url = `https://terabox.hnn.workers.dev/api/get-info?shorturl=${inputUrl.split("/").pop()}&pwd=`;
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://terabox.hnn.workers.dev/",
      };
      const response = await fetch(url, {
        headers: headers,
      });
      if (!response.ok) {
        throw new Error(
          `Gagal mengambil informasi file: ${response.status} ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Gagal mengambil informasi file:", error);
      throw error;
    }
  }
  async getDownloadLink(fsId, shareid, uk, sign, timestamp) {
    try {
      const url = "https://terabox.hnn.workers.dev/api/get-download";
      const headers = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://terabox.hnn.workers.dev/",
      };
      const data = {
        shareid: shareid,
        uk: uk,
        sign: sign,
        timestamp: timestamp,
        fs_id: fsId,
      };
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(
          `Gagal mengambil link download: ${response.status} ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Gagal mengambil link download:", error);
      throw error;
    }
  }
  async download(inputUrl) {
    try {
      const { list, shareid, uk, sign, timestamp } =
        await this.getInfo(inputUrl);

      if (!list || list.length === 0) {
        throw new Error("Tidak ada file ditemukan.");
      }

      const downloadPromises = list.map(async (file) => {
        const fsId = file.fs_id;
        const { downloadLink } = await this.getDownloadLink(
          fsId,
          shareid,
          uk,
          sign,
          timestamp,
        );
        return downloadLink;
      });

      const downloadLinks = await Promise.all(downloadPromises);
      return downloadLinks;
    } catch (error) {
      console.error("Gagal mengunduh file:", error);
      throw error;
    }
  }
}
const teraboxhnn = new TeraboxHnn();

const download = async (inputUrl) => {
  try {
    return await teraboxhnn.download(inputUrl);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

const info = async (inputUrl) => {
  try {
    return await teraboxhnn.getInfo(inputUrl);
  } catch (error) {
    console.error("Error fetching info:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url, type } = req.query;

  if (!(url || type))
    return res.status(400).json({ message: "No url, type provided" });

  const result =
    type && type === "info" ? await info(url) : await download(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
