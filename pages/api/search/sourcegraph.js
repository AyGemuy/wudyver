import axios from "axios";
class SearchService {
  constructor(baseURL, headers) {
    this.api = axios.create({
      baseURL: baseURL || "https://sourcegraph.com/.api/search/",
      headers: headers || {
        accept: "*/*",
        "accept-language": "id-ID",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "Sourcegraph",
        "x-sourcegraph-api-client-feature": "search.navigate",
        "x-sourcegraph-api-client-name": "web",
        "x-sourcegraph-api-client-version": `341743_2025-09-23_${Math.random().toString(36).substring(2, 7)}`,
        "x-sourcegraph-client": "https://sourcegraph.com"
      }
    });
  }
  async search({
    query,
    ...rest
  }) {
    console.log("Proses pencarian dimulai...");
    try {
      const params = new URLSearchParams({
        q: `context:global '${query}' repo:boost.relevant()`,
        v: "V3",
        t: "keyword",
        sm: "0",
        display: "1500",
        cm: "t",
        "max-line-len": "5120",
        ...rest
      });
      const requestUrl = `stream?${params.toString()}`;
      console.log("URL Permintaan:", `${this.api.defaults.baseURL}${requestUrl}`);
      const response = await this.api.get(requestUrl, {
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        const stream = response.data;
        let buffer = "";
        const allEvents = {};
        stream.on("data", chunk => {
          buffer += chunk.toString();
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const eventBlock = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);
            let eventType = "message";
            let eventData = "";
            const lines = eventBlock.split("\n");
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith("data: ")) {
                eventData += line.substring(6).trim();
              }
            }
            if (eventData) {
              console.log(`Menerima event: ${eventType}`);
              try {
                const parsedData = JSON.parse(eventData);
                allEvents[eventType] = (allEvents[eventType] || []).concat(parsedData);
              } catch (e) {
                console.error(`Gagal mem-parsing JSON dari event '${eventType}':`, eventData);
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        });
        stream.on("end", () => {
          console.log("Proses pencarian stream selesai.");
          const summaryMessage = allEvents.matches?.length > 0 ? `Ditemukan ${allEvents.matches.length} hasil.` : "Tidak ada hasil yang cocok ditemukan.";
          console.log(summaryMessage);
          resolve(allEvents);
        });
        stream.on("error", error => {
          console.error("Terjadi kesalahan pada stream:", error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Terjadi kesalahan saat melakukan permintaan pencarian:", error.message);
      const statusCode = error.response?.status;
      console.error("Status Kode Kesalahan:", statusCode || "Tidak ada status kode");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const api = new SearchService();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}