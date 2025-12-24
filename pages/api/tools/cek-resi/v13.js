import axios from "axios";
class ShipperAPI {
  constructor() {
    this.ax = axios.create({
      baseURL: "https://gql-web.shipper.id",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://shipper.id",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://shipper.id/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-app-name": "shp-homepage-v5",
        "x-app-version": "1.0.0"
      }
    });
    this.lMap = {
      1: {
        name: "JNE",
        sub: "jne"
      },
      3: {
        name: "Rpx",
        sub: "rpx"
      },
      5: {
        name: "SiCepat",
        sub: "sicepat"
      },
      6: {
        name: "Tiki",
        sub: "tiki"
      },
      9: {
        name: "J&T",
        sub: "jnt"
      },
      16: {
        name: "Lion Parcel",
        sub: "lion-parcel"
      },
      24: {
        name: "DPex",
        sub: "dpex"
      },
      26: {
        name: "Paxel",
        sub: "paxel"
      },
      33: {
        name: "SAP",
        sub: "sap"
      },
      37: {
        name: "Shipper",
        sub: "shipper"
      },
      38: {
        name: "Indah Cargo",
        sub: "indah-cargo"
      }
    };
    this.lNIDMap = Object.entries(this.lMap).reduce((acc, [id, data]) => {
      acc[data.name.toLowerCase()] = id;
      acc[data.sub.toLowerCase()] = id;
      return acc;
    }, {});
  }
  async getExp({
    resi = "JX3708794672"
  }) {
    if (!resi) {
      console.error("Error: 'resi' (tracking number) is required for getExp.");
      return {
        error: "'resi' (tracking number) is required."
      };
    }
    try {
      const p = {
        operationName: "logisticRefSuggestion",
        query: `query logisticRefSuggestion($payload: ParamLogisticRefSuggestionInput!) {
                    logisticRefSuggestion(p: $payload)
                }`,
        variables: {
          payload: {
            referenceNo: [resi]
          }
        }
      };
      const res = await this.ax.post("/query", p);
      const sIds = res.data?.data?.logisticRefSuggestion || [];
      const fList = sIds.map(id => {
        const lInfo = this.lMap[id.toString()];
        return lInfo ? {
          name: lInfo.name,
          num: id,
          sub: lInfo.sub
        } : null;
      }).filter(item => item !== null);
      return {
        list: fList
      };
    } catch (err) {
      console.error("Error fetching expedition suggestions:", err.res ? err.res.data : err.message);
      return {
        error: "Failed to fetch expedition suggestions",
        details: err.res ? err.res.data : err.message
      };
    }
  }
  async track({
    resi = "JX3708794672",
    expedisi = null
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
          console.error(`Error: Expedition '${expedisi}' not found in logistic map.`);
          return {
            error: `Expedition '${expedisi}' not found.`
          };
        }
      } else {
        const sRes = await this.getExp({
          resi: resi
        });
        if (sRes.error || !sRes.list || sRes.list.length === 0) {
          console.warn(`No expedition suggestions found for resi: ${resi}. Cannot proceed with tracking.`);
          return {
            message: "No expedition suggestions found. Cannot track without a specific expedition."
          };
        }
        lId = sRes.list[0].num.toString();
        console.log(`Automatically selected logistic ID: ${lId} (${this.lMap[lId]?.name || "Unknown"}) based on suggestion.`);
      }
      const p = {
        operationName: "trackingDirect",
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
                }`,
        variables: {
          input: {
            logisticId: parseInt(lId),
            referenceNo: [resi]
          }
        }
      };
      const res = await this.ax.post("/query", p);
      return this._fmtTr(res.data);
    } catch (err) {
      console.error("Error fetching tracking details:", err.res ? err.res.data : err.message);
      return {
        error: "Failed to fetch tracking details",
        details: err.res ? err.res.data : err.message
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
  const api = new ShipperAPI();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        data = await api.track(params);
        return res.status(200).json(data);
      case "list":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        data = await api.getExp(params);
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