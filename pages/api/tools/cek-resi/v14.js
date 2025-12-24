import axios from "axios";
import * as cheerio from "cheerio";
class LogitekAPI {
  constructor() {
    this.ax = axios.create({
      baseURL: "https://logitek.id",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://logitek.id",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://logitek.id/id/cek-resi",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-app-name": "shp-homepage-v5",
        "x-app-version": "1.0.0"
      }
    });
    this.lMap = {};
    this.lNIDMap = {};
  }
  async getExpeditions() {
    try {
      const response = await this.ax.get("/id/cek-resi");
      const $ = cheerio.load(response.data);
      const expList = [];
      $("form.ui.form button.ui.basic.button").each((i, el) => {
        const name = $(el).find("span").text().trim();
        const num = $(el).attr("value");
        const id = $(el).attr("id");
        if (name && num) {
          const logisticInfo = {
            name: name,
            num: parseInt(num),
            sub: id || name.toLowerCase().replace(/[^a-z0-9]/g, "")
          };
          expList.push(logisticInfo);
          this.lMap[logisticInfo.num.toString()] = logisticInfo;
          this.lNIDMap[logisticInfo.name.toLowerCase()] = logisticInfo.num.toString();
          if (logisticInfo.sub) {
            this.lNIDMap[logisticInfo.sub.toLowerCase()] = logisticInfo.num.toString();
          }
        }
      });
      return {
        list: expList
      };
    } catch (error) {
      console.error("Error fetching Logitek expeditions:", error.response ? error.response.status : error.message);
      return {
        error: "Failed to fetch Logitek expeditions",
        details: error.response ? error.response.statusText : error.message
      };
    }
  }
  async track({
    resi = "JX3708794672",
    expedisi = "jnt"
  }) {
    if (!resi) {
      console.error("Error: 'resi' (tracking number) is required for track.");
      return {
        error: "'resi' (tracking number) is required."
      };
    }
    let lId;
    try {
      if (expedisi) {
        lId = this.lNIDMap[expedisi.toLowerCase()];
        if (!lId) {
          console.warn(`Expedition '${expedisi}' not found in current map. Attempting to re-fetch expeditions.`);
          const expResult = await this.getExpeditions();
          if (expResult.error) {
            console.error(`Failed to re-fetch expeditions: ${expResult.error}`);
            return {
              error: `Expedition '${expedisi}' not found and failed to refresh expedition list.`
            };
          }
          lId = this.lNIDMap[expedisi.toLowerCase()];
          if (!lId) {
            console.error(`Error: Expedition '${expedisi}' still not found after refresh.`);
            return {
              error: `Expedition '${expedisi}' not found.`
            };
          }
        }
      } else {
        const suggestionResult = await this.getExpeditions();
        if (suggestionResult.error || !suggestionResult.list || suggestionResult.list.length === 0) {
          console.warn(`No expedition suggestions found for resi: ${resi}. Cannot proceed with tracking.`);
          return {
            message: "No expedition suggestions found. Cannot track without a specific expedition."
          };
        }
        lId = suggestionResult.list[0].num.toString();
        console.log(`Automatically selected logistic ID: ${lId} (${this.lMap[lId]?.name || "Unknown"}) based on suggestion.`);
      }
      const p = {
        operationName: "trackingDirect",
        variables: {
          input: {
            logisticId: parseInt(lId),
            referenceNo: [resi]
          }
        },
        query: `query trackingDirect($input: TrackingDirectInput!) {
                    trackingDirect(p: $input) {
                        referenceNo
                        logistic {
                            id
                            __typename
                        }
                        shipmentDate
                        details {
                            datetime
                            shipperStatus {
                                name
                                description
                                __typename
                            }
                            logisticStatus {
                                name
                                description
                                __typename
                            }
                            __typename
                        }
                        consigner {
                            name
                            address
                            __typename
                        }
                        consignee {
                            name
                            address
                            __typename
                        }
                        __typename
                    }
                }`
      };
      const res = await this.ax.post("/api.php", p);
      return this._fmtTr(res.data);
    } catch (err) {
      console.error("Error fetching tracking details:", err.response ? err.response.data : err.message);
      return {
        error: "Failed to fetch tracking details",
        details: err.response ? err.response.data : err.message
      };
    }
  }
  _fmtTr(data) {
    const tData = data?.data?.trackingDirect?.[0];
    if (!tData) {
      return {
        message: "No tracking data found for this resi and expedition."
      };
    }
    const fDets = tData.details.map(det => ({
      datetime: det.datetime,
      shipperStatus: det.shipperStatus?.description || det.shipperStatus?.name || "N/A",
      logisticStatus: det.logisticStatus?.description || det.logisticStatus?.name || "N/A"
    }));
    const lName = this.lMap[tData.logistic.id]?.name || `ID ${tData.logistic.id}`;
    return {
      referenceNo: tData.referenceNo,
      logistic: {
        id: tData.logistic.id,
        name: lName
      },
      shipmentDate: tData.shipmentDate || "N/A",
      consigner: {
        name: tData.consigner?.name || "N/A",
        address: tData.consigner?.address || "N/A"
      },
      consignee: {
        name: tData.consignee?.name || "N/A",
        address: tData.consignee?.address || "N/A"
      },
      trackingHistory: fDets
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new LogitekAPI();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        if (!params.expedisi) {
          data = await api.getExpeditions();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.track(params);
        return res.status(200).json(data);
      case "list":
        data = await api.getExpeditions();
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "list"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}