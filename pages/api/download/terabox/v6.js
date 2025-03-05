import axios from "axios";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

class TeraBoxResolver {
    constructor() {
        this.cookieJar = new CookieJar();
        this.protocolAndSubdomain = "https://www.terabox.com";
        this.axiosInstance = wrapper(axios.create({
            jar: this.cookieJar,
            withCredentials: true
        }));
    }
    
    async getSurl(input) {
    if (!/^https?:\/\//.test(input)) return input;
    try {
      const { headers } = await this.axiosInstance.get(input, { maxRedirects: 0, validateStatus: s => s >= 300 && s < 400 });
      return new URL(headers.location).searchParams.get("surl") || input;
    } catch {
      return input;
    }
  }

    async getMediaUrl(input) {
    const mediaId = await this.getSurl(input);
        console.log(`[INFO] Mengambil data media untuk ID: ${mediaId}`);
        const webUrl = `${this.protocolAndSubdomain}/sharing/embed?surl=${mediaId}`;
        try {
            const { data: html } = await this.axiosInstance.get(webUrl);
            const $ = cheerio.load(html);

            console.log(`[INFO] Parsing jsToken...`);
            const jsTokenMatch = html.match(/"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+)%22%29/);
            if (!jsTokenMatch) throw new Error("Tidak dapat menemukan jsToken.");

            const jsToken = jsTokenMatch[1];
            const dpLogId = new URL($('meta[property="og:image"]').attr("content")).searchParams.get("dp-logid");

            console.log(`[INFO] Mengambil informasi short URL...`);
            const queryParams = new URLSearchParams({
                app_id: "250528",
                web: "1",
                channel: "dubox",
                clienttype: "0",
                jsToken,
                shorturl: `1${mediaId}`,
                root: "1",
                scene: ""
            });

            const { data: result } = await this.axiosInstance.get(`${this.protocolAndSubdomain}/api/shorturlinfo?${queryParams}`);

            const fileList = [];
            console.log(`[INFO] Memproses daftar file dan folder...`);

            for (const item of result.list) {
                const { fs_id, isdir, path, server_filename, size } = item;
                const fullPath = path || `/${server_filename}`;
                
                if (isdir === "1") {
                    console.log(`[INFO] Folder ditemukan: ${fullPath}, mengambil isi...`);
                    const folderContents = await this.getFolderContents(mediaId, fullPath);
                    fileList.push({ folder: folderContents });
                } else {
                    try {
                        console.log(`[INFO] Mengambil link unduhan untuk file: ${fullPath}`);
                        const downloadLink = await this.getDownloadLink({
                            shareid: result.shareid,
                            uk: result.uk,
                            sign: result.sign,
                            timestamp: result.timestamp,
                            fs_id
                        }, { jsToken, dpLogId });

                        fileList.push({ 
                            files: [{ 
                                name: server_filename, 
                                path: fullPath, 
                                size: this.formatSize(size), 
                                downloadLink: downloadLink?.downloadLink || null 
                            }]
                        });
                    } catch (error) {
                        console.error(`[ERROR] Gagal mendapatkan link untuk ${server_filename}: ${error.message}`);
                    }
                }
            }

            console.log(`[INFO] Proses selesai.`);
            return fileList;
        } catch (error) {
            throw new Error(`Gagal mengambil URL media: ${error.message}`);
        }
    }

    async getFolderContents(mediaId, path) {
        console.log(`[INFO] Mengambil isi folder: ${path}`);
        try {
            const { data: html } = await this.axiosInstance.get(`${this.protocolAndSubdomain}/web/share/link?surl=${mediaId}&path=${encodeURIComponent(path)}`);
            const $ = cheerio.load(html);

            console.log(`[INFO] Parsing jsToken dalam folder...`);
            const jsTokenMatch = html.match(/"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+)%22%29/);
            if (!jsTokenMatch) throw new Error("Tidak dapat menemukan jsToken dalam folder.");

            const jsToken = jsTokenMatch[1];
            const dpLogId = new URL($('meta[property="og:image"]').attr("content")).searchParams.get("dp-logid");

            const queryParams = new URLSearchParams({
                app_id: "250528",
                web: "1",
                channel: "dubox",
                clienttype: "5",
                jsToken,
                "dp-logid": dpLogId,
                version: "0",
                devuid: "0",
                cuid: "0",
                lang: "id",
                page: "1",
                num: "100",
                by: "name",
                order: "asc",
                shorturl: mediaId,
                dir: encodeURIComponent(path)
            });

            console.log(`[INFO] Mengambil daftar isi folder...`);
            const { data } = await this.axiosInstance.get(`${this.protocolAndSubdomain}/share/list?${queryParams}`);

            const folderContents = [];
            for (const item of data.list || []) {
                if (item.isdir === "1") {
                    folderContents.push({ folder: await this.getFolderContents(mediaId, item.path) });
                } else {
                    console.log(`[INFO] Mengambil link unduhan untuk file dalam folder: ${item.path}`);
                    try {
                        const downloadLink = await this.getDownloadLink({
                            shareid: data.shareid,
                            uk: data.uk,
                            sign: data.sign,
                            timestamp: data.timestamp,
                            fs_id: item.fs_id
                        }, { jsToken, dpLogId });

                        folderContents.push({
                            files: [{ 
                                name: item.server_filename, 
                                path: item.path, 
                                size: this.formatSize(item.size), 
                                downloadLink: downloadLink?.downloadLink || null
                            }]
                        });
                    } catch (error) {
                        console.error(`[ERROR] Gagal mendapatkan link untuk ${item.server_filename}: ${error.message}`);
                    }
                }
            }

            return folderContents;
        } catch (error) {
            throw new Error(`Gagal mengambil isi folder: ${error.message}`);
        }
    }

    async getDownloadLink({ shareid, uk, sign, timestamp, fs_id }, { jsToken, dpLogId }) {
        console.log(`[INFO] Mengambil link unduhan untuk fs_id: ${fs_id}`);
        try {
            const queryParams = new URLSearchParams({
                app_id: "250528",
                web: "1",
                channel: "dubox",
                clienttype: "0",
                jsToken,
                "dp-logid": dpLogId,
                shareid,
                uk,
                sign,
                timestamp,
                primaryid: shareid,
                product: "share",
                nozip: "0",
                fid_list: `[${fs_id}]`
            });

            const { data } = await this.axiosInstance.get(`${this.protocolAndSubdomain}/share/download?${queryParams}`);
            if (data.errno !== 0) throw new Error(`Gagal mendapatkan URL unduhan | Errno: ${data.errno}`);

            return { downloadLink: data.dlink };
        } catch (error) {
            throw new Error(`Gagal mendapatkan link unduhan: ${error.message}`);
        }
    }

    formatSize(bytes) {
        if (!bytes) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(2)} ${units[i]}`;
    }
}

export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No url provided"
    });
  }
  const resolver = new TeraBoxResolver();
  try {
    const result = await resolver.getMediaUrl(url);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during download:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}