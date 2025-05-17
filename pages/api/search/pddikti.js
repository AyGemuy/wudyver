import axios from "axios";
import CryptoJS from "crypto-js";
class Pddikti {
  constructor() {
    this.baseUrl = "https://api-pddikti.kemdiktisaintek.go.id";
    this.headers = {
      accept: "application/json, text/plain, */*",
      origin: "https://pddikti.kemdiktisaintek.go.id",
      referer: "https://pddikti.kemdiktisaintek.go.id/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.key = CryptoJS.enc.Base64.parse("ecHyOABV9jgO2/+dzE49cfexQpr/H4SiAYWrHLD7PQ0=");
    this.iv = CryptoJS.enc.Base64.parse("Gu3qsglYJhOOm0eXf6aN2w==");
  }
  async search({
    query,
    type = ""
  }) {
    try {
      const response = await axios.get(`${this.baseUrl}/pencarian/enc/all/${query}`, {
        headers: this.headers
      });
      const encryptedData = response.data;
      if (encryptedData) {
        const decryptedData = this.decryptData(encryptedData);
        if (decryptedData) {
          try {
            const parsedData = JSON.parse(decryptedData);
            if (!type) {
              return parsedData;
            }
            return this.findResult(parsedData, type);
          } catch (error) {
            console.error("Gagal mem-parse data JSON setelah dekripsi:", error);
            return this.findResult(decryptedData, type);
          }
        }
      }
      return this.findResult(null, type);
    } catch (error) {
      console.error("Error saat melakukan pencarian:", error);
      return this.findResult(null, type);
    }
  }
  findResult(data, type) {
    const result = {};
    if (data && typeof data === "object") {
      if (type && data.hasOwnProperty(type)) {
        result[type] = data[type];
      } else if (!type) {
        return data;
      }
    } else if (data) {
      return data;
    }
    return result;
  }
  async detail({
    id,
    type
  }) {
    try {
      let detailData = null;
      switch (type) {
        case "dosen":
          detailData = {};
          const dosenEndpoints = [{
            key: "studyHistory",
            url: `${this.baseUrl}/dosen/study-history/${id}`
          }, {
            key: "teachingHistory",
            url: `${this.baseUrl}/dosen/teaching-history/${id}`
          }, {
            key: "portofolioPengabdian",
            url: `${this.baseUrl}/dosen/portofolio/pengabdian/${id}`
          }, {
            key: "portofolioPenelitian",
            url: `${this.baseUrl}/dosen/portofolio/penelitian/${id}`
          }, {
            key: "portofolioKarya",
            url: `${this.baseUrl}/dosen/portofolio/karya/${id}`
          }, {
            key: "portofolioPaten",
            url: `${this.baseUrl}/dosen/portofolio/paten/${id}`
          }, {
            key: "profile",
            url: `${this.baseUrl}/dosen/profile/${id}`
          }];
          for (const endpoint of dosenEndpoints) {
            try {
              const response = await axios.get(endpoint.url, {
                headers: this.headers
              });
              detailData[endpoint.key] = response.data;
            } catch (error) {
              console.error(`Error fetching ${endpoint.key}:`, error);
              detailData[endpoint.key] = null;
              continue;
            }
          }
          break;
        case "mahasiswa":
          try {
            const mhsResponse = await axios.get(`${this.baseUrl}/detail/mhs/${id}`, {
              headers: this.headers
            });
            detailData = mhsResponse.data;
          } catch (error) {
            console.error("Error fetching mahasiswa data:", error);
            detailData = null;
          }
          break;
        case "pt":
          detailData = {};
          const ptEndpoints = [{
            key: "detail",
            url: `${this.baseUrl}/pt/detail/${id}`
          }, {
            key: "prodi",
            url: `${this.baseUrl}/pt/prodi/${id}`
          }, {
            key: "rasio",
            url: `${this.baseUrl}/pt/rasio/${id}`
          }, {
            key: "mahasiswa",
            url: `${this.baseUrl}/pt/mahasiswa/${id}`
          }, {
            key: "waktuStudi",
            url: `${this.baseUrl}/pt/waktu-studi/${id}`
          }, {
            key: "sarprasFileName",
            url: `${this.baseUrl}/pt/sarpras-file-name/${id}`
          }, {
            key: "nameHistories",
            url: `${this.baseUrl}/pt/name-histories/${id}`
          }, {
            key: "costRange",
            url: `${this.baseUrl}/pt/cost-range/${id}`
          }];
          for (const endpoint of ptEndpoints) {
            try {
              const response = await axios.get(endpoint.url, {
                headers: this.headers
              });
              detailData[endpoint.key] = response.data;
            } catch (error) {
              console.error(`Error fetching ${endpoint.key}:`, error);
              detailData[endpoint.key] = null;
              continue;
            }
          }
          detailData.logo = `${this.baseUrl}/pt/logo/${id}`;
          break;
        case "prodi":
          detailData = {};
          const prodiEndpoints = [{
            key: "numStudentsLecturers",
            url: `${this.baseUrl}/prodi/num-students-lecturers/${id}`
          }, {
            key: "desc",
            url: `${this.baseUrl}/prodi/desc/${id}`
          }, {
            key: "nameHistories",
            url: `${this.baseUrl}/prodi/name-histories/${id}`
          }, {
            key: "costRange",
            url: `${this.baseUrl}/prodi/cost-range/${id}`
          }, {
            key: "homebaseDosen",
            url: `${this.baseUrl}/prodi/homebase-dosen/${id}`
          }, {
            key: "rasioDosen",
            url: `${this.baseUrl}/prodi/penghitung-ratio/${id}`
          }];
          for (const endpoint of prodiEndpoints) {
            try {
              const response = await axios.get(endpoint.url, {
                headers: this.headers
              });
              detailData[endpoint.key] = response.data;
            } catch (error) {
              console.error(`Error fetching ${endpoint.key}:`, error);
              detailData[endpoint.key] = null;
              continue;
            }
          }
          detailData.logoPt = `${this.baseUrl}/prodi/logo-pt/${id}`;
          break;
        default:
          return {
            error: `Tipe "${type}" tidak dikenali untuk detail`
          };
      }
      return {
        [type]: detailData
      };
    } catch (error) {
      console.error(`Error fetching detail untuk tipe "${type}":`, error);
      return null;
    }
  }
  decryptData(encryptedData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.key, {
        iv: this.iv,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Gagal mendekripsi data:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const pddikti = new Pddikti();
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | detail"
      }
    });
  }
  try {
    let result;
    switch (action) {
      case "search":
        const {
          query,
          type
        } = params;
        if (!query) {
          return res.status(400).json({
            error: "Missing required field: query (required for search)"
          });
        }
        result = await pddikti.search({
          query: query,
          type: type
        });
        break;
      case "detail":
        const {
          id,
          type: detailType
        } = params;
        if (!id || !detailType) {
          return res.status(400).json({
            error: "Missing required fields: id and type (required for detail)"
          });
        }
        result = await pddikti.detail({
          id: id,
          type: detailType
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: `API processing error: ${error.message || "Internal Server Error"}`
    });
  }
}