import axios from "axios";
class GDrive {
  constructor() {
    this.k = "AIzaSyAA9ERw-9LZVEohRYtCWka_TQc6oXmvcVU";
  }
  async download({
    url,
    ...opt
  }) {
    console.log("Mulai download:", url);
    try {
      const id = this.e(url);
      if (!id) throw new Error("Invalid Google Drive URL or ID.");
      console.log("File ID:", id);
      const {
        data: m
      } = await axios.get(`https://www.googleapis.com/drive/v3/files/${id}`, {
        params: {
          key: this.k,
          fields: "id,name,mimeType,size,webContentLink,owners,createdTime"
        }
      });
      if (m.mimeType === "application/vnd.google-apps.folder") {
        console.log("Folder detected:", m.name);
        const {
          data: l
        } = await axios.get(`https://www.googleapis.com/drive/v3/files`, {
          params: {
            key: this.k,
            q: `'${id}' in parents`,
            fields: "files(id,name,mimeType,size,owners,createdTime)"
          }
        });
        const files = l.files || [];
        return {
          type: "folder",
          details: {
            id: m.id,
            name: m.name,
            mimeType: m.mimeType,
            createdTime: m.createdTime,
            totalFiles: files.length,
            owner: m.owners?.[0] ? {
              name: m.owners[0].displayName,
              email: m.owners[0].emailAddress,
              photoLink: m.owners[0].photoLink
            } : null
          },
          contents: files.filter(f => !f.mimeType?.includes("application/vnd.google-apps.folder")).map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
            createdTime: f.createdTime,
            downloadUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${this.k}`
          }))
        };
      }
      console.log("File detected:", m.name);
      return {
        type: "file",
        details: {
          id: m.id,
          name: m.name,
          mimeType: m.mimeType,
          size: m.size ? `${(m.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
          createdTime: m.createdTime,
          owner: m.owners?.[0] ? {
            name: m.owners[0].displayName,
            email: m.owners[0].emailAddress,
            photoLink: m.owners[0].photoLink
          } : null
        },
        downloadUrl: `https://www.googleapis.com/drive/v3/files/${m.id}?alt=media&key=${this.k}`,
        directDownload: m.webContentLink || null
      };
    } catch (e) {
      console.error("Error:", e.message);
      throw new Error(e.message);
    }
  }
  e(u) {
    const p = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /folders\/([a-zA-Z0-9_-]+)/, /^([a-zA-Z0-9_-]+)$/];
    for (const r of p) {
      const m = u.match(r);
      if (m) return m[1];
    }
    return null;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const api = new GDrive();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}