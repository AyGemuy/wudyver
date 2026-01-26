import axios from "axios";
import * as cheerio from "cheerio";
class NetflixApi {
  constructor() {
    this.base = "https://web.prod.cloud.netflix.com/graphql";
    this.htmlBase = "https://www.netflix.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.5",
      "content-type": "application/json",
      dnt: "1",
      origin: "https://www.netflix.com",
      priority: "u=1, i",
      referer: "https://www.netflix.com/",
      "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Brave";v="140"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "sec-gpc": "1",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "x-netflix.context.app-version": "v60c7d392",
      "x-netflix.context.hawkins-version": "5.4.0",
      "x-netflix.context.locales": "ro-ro",
      "x-netflix.context.operation-name": "SearchPageQueryResults",
      "x-netflix.context.ui-flavor": "akira",
      "x-netflix.request.attempt": "1",
      "x-netflix.request.client.context": '{"appstate":"foreground"}',
      "x-netflix.request.id": "ad905f7f8d134eac89ce11e645f7c69c",
      "x-netflix.request.originating.url": "https://www.netflix.com/search?q=better",
      "x-netflix.request.toplevel.uuid": "a0c606b1-2a9a-4f35-a9d9-62227cf7b1fa",
      cookie: "netflix-sans-normal-3-loaded=true; netflix-sans-bold-3-loaded=true; nfvdid=BQFmAAEBENj1aULP097r7dWdkt8tiBZgi2DHNMRtUtsyCylcfOyK_iHNSO78RJ67GQ9OsXujFdQDSZZy4qF09UY-qFeUE77cYbh67Melm0LsHOkDV-TqxMS46oTXQ0IKnlK6ycWOTtRtGqXqkDBGME5oxCevsK5i; SecureNetflixId=v%3D3%26mac%3DAQEAEQABABRO6tfc5E4YGUmztgpBIErGvNU9ARH732M.%26dt%3D1758905665371; NetflixId=ct%3DBgjHlOvcAxLfA_U8OP3Zf8-6gRiNXVRYI-tHzihCt8y9LqLJ_8p8SJQAt-RRZwN9C8BB23hiqHa_enOu-uJVYuNDK7Bb2lpS9aTyJcT-9NMzAG1WRua-2nlv9WtSAFDKIeXgPXJY88XGKQLZU5ZtTB7k_choxl-bpwDoPo4rMSuExKmuXzOGTcSatxfdj7pO_FboB21MQeMC6o2pat41UiQ0qZLZ0cNYefaXwxODzjUpkihpru0MirJcl8aeTwyyxqERBZidip2Z2MdPLfvlyxqLk4yVnUJft14Ho7OTbHhosZK-L34aR8xjhp-1lIpi_7enjCEFk3hrUJqYAlKZFP31pkrd7BsOWin5TA1Z24_YFkzfk6FddgYpv1U-hih42cctJQ11X5O58CMd-mxKNoWYJGkCg_2KE2Pe9q9LyC5_3xZIyA6QoCIwBLJsFVBc7nYJOkPXxM2UIZegGlBrFOi7YT56LZHN8G5NtkbFO-FKwyXvqCBPJYWtt8yqgE_bO3XWA-vMv7TJiMqKfnvPYaf55wF_EuICSwJILsal2WdJbTzx1eLenOnJ5lDdd_3woQfGmMeEC7io7-bstHchO9dgj38p9iteGXFgZ6cB3VwYY0OaKkkDma78VEl-jUJZ-LiQjvnc4xidGAYiDgoMQmBL2Ra8do9bVmf4%26ch%3DAQEAEAABABRK4PYy7cNg6GibaTLCmR7uKQ01mV11jME.%26v%3D3%26pg%3DH2BR2MLKKZA6VLKFUESM635TF4; flwssn=fc0c9e5e-f94e-49f9-b653-1f8fed5c0847; gsid=10ce21d8-5a87-4b1c-81a0-bef7d68fba83; profilesNewSession=0"
    };
  }
  async request(payload) {
    try {
      const response = await axios.post(this.base, payload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      throw error;
    }
  }
  async search({
    query = "",
    cursor = null,
    ...rest
  }) {
    console.log(`🔍 Searching: ${query}`);
    try {
      this.headers["x-netflix.context.operation-name"] = "SearchPageQueryResults";
      this.headers["x-netflix.request.originating.url"] = `https://www.netflix.com/search?q=${query}`;
      const payload = {
        operationName: "SearchPageQueryResults",
        variables: {
          artworkParamsStandardBoxshot: {
            artworkType: "SDP",
            dimension: {
              width: 342,
              height: 192
            },
            features: {
              fallbackStrategy: "STILL"
            }
          },
          artworkParamsStandardCloudAppIcon: {
            artworkType: "GAME_CLOUD_BOXART_HORIZONTAL_INCOMPATIBLE",
            dimension: {
              width: 342,
              height: 192
            },
            features: {
              fallbackStrategy: "STILL",
              topContentTypeBadge: true
            }
          },
          artworkParamsStandardMobileAppIcon: {
            artworkType: "GAME_ICON_BOXART_HORIZONTAL_CARD",
            dimension: {
              width: 342,
              height: 192
            },
            features: {
              fallbackStrategy: "STILL",
              topContentTypeBadge: true
            }
          },
          pageSize: 48,
          options: {
            pageCapabilities: {
              base: {
                canHandlePlayingCloudGames: false,
                capabilitiesBySection: {
                  pinotGallery: {
                    base: {
                      capabilitiesBySectionTreatment: {
                        pinotCreatorHome: {
                          base: {
                            capabilitiesByEntityTreatment: {
                              pinotStandardBoxshot: {
                                base: {
                                  canHandleEntityKinds: ["VIDEO"]
                                }
                              },
                              pinotStandardCloudAppIcon: {
                                base: {
                                  canHandleEntityKinds: ["GAME"]
                                }
                              },
                              pinotStandardMobileAppIcon: {
                                base: {
                                  canHandleEntityKinds: ["GAME"]
                                }
                              },
                              pinotStandardDestination: {
                                base: {
                                  canHandleEntityKinds: ["GENERIC_CONTAINER"]
                                }
                              }
                            },
                            maxTotalEntities: 300
                          }
                        },
                        pinotStandard: {
                          base: {
                            capabilitiesByEntityTreatment: {
                              pinotStandardBoxshot: {
                                base: {
                                  canHandleEntityKinds: ["VIDEO"]
                                }
                              },
                              pinotStandardCloudAppIcon: {
                                base: {
                                  canHandleEntityKinds: ["GAME"]
                                }
                              },
                              pinotStandardMobileAppIcon: {
                                base: {
                                  canHandleEntityKinds: ["GAME"]
                                }
                              },
                              pinotStandardDestination: {
                                base: {
                                  canHandleEntityKinds: ["GENERIC_CONTAINER"]
                                }
                              }
                            },
                            maxTotalEntities: 300
                          }
                        }
                      }
                    }
                  },
                  pinotList: {
                    base: {
                      capabilitiesBySectionTreatment: {
                        pinotSuggestions: {
                          base: {
                            capabilitiesByEntityTreatment: {
                              pinotSuggestion: {
                                base: {
                                  canHandleEntityKinds: ["AUTOCOMPLETE", "VIDEO", "CHARACTER", "GENERIC_CONTAINER", "GENRE", "PERSON"]
                                }
                              }
                            },
                            maxTotalEntities: 100
                          }
                        }
                      }
                    }
                  }
                },
                maxTotalSections: 2
              },
              canHandleComplexSectionId: true
            },
            session: {
              id: "e296ab9b-bb2c-4b7d-827c-9b83c215295b"
            }
          },
          searchTerm: query,
          endCursor: null
        },
        extensions: {
          persistedQuery: {
            id: "72c86526-8d73-4949-82f6-43f3ee66cbb4",
            version: 102
          }
        }
      };
      const response = await this.request(payload);
      return response?.data?.page?.sections || {};
    } catch (error) {
      console.log(`❌ Search failed: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  async detail({
    id,
    ...rest
  }) {
    console.log(`🎬 Fetching ${id} items`);
    try {
      this.headers["x-netflix.context.operation-name"] = "DetailModal";
      const payload = {
        operationName: "DetailModal",
        variables: {
          opaqueImageFormat: "WEBP",
          transparentImageFormat: "WEBP",
          videoMerchEnabled: true,
          fetchPromoVideoOverride: false,
          hasPromoVideoOverride: false,
          promoVideoId: 0,
          videoMerchContext: "BROWSE",
          isLiveEpisodic: true,
          artworkContext: {},
          textEvidenceUiContext: "ODP",
          unifiedEntityId: `Video:${id}`
        },
        extensions: {
          persistedQuery: {
            id: "e0f86eeb-c2cd-4b7c-955f-5da5455124be",
            version: 102
          }
        }
      };
      const response = await this.request(payload);
      return response?.data?.unifiedEntities || {};
    } catch (error) {
      console.log(`❌ Detail failed: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  async season({
    id,
    ...rest
  }) {
    console.log(`🎬 Fetching Season for Show ID: ${id}`);
    try {
      this.headers["x-netflix.context.operation-name"] = "PreviewModalEpisodeSelector";
      const detailData = await this.detail({
        id: id
      });
      let showId = id;
      if (detailData && detailData.length > 0) {
        const entity = detailData[0];
        if (entity.__typename === "Season" && entity.parentShow && entity.parentShow.videoId) {
          showId = entity.parentShow.videoId;
          console.log(`📺 Detected season ${id}, using parent show ID: ${showId}`);
        } else if (entity.__typename === "Episode" && entity.parentSeason && entity.parentSeason.parentShow) {
          showId = entity.parentSeason.parentShow.videoId;
          console.log(`🎞️ Detected episode ${id}, using parent show ID: ${showId}`);
        } else if (entity.__typename === "Show") {
          showId = entity.videoId;
          console.log(`🎬 Already a show: ${showId}`);
        }
      }
      const payload = {
        operationName: "PreviewModalEpisodeSelector",
        variables: {
          seasonCount: 100,
          showId: showId,
          locale: "en-US"
        },
        extensions: {
          persistedQuery: {
            id: "b1213a1e-19d0-42e6-aeed-7a29d855346c",
            version: 102
          }
        }
      };
      const response = await this.request(payload);
      return response?.data || {};
    } catch (error) {
      console.log(`❌ Season failed: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  async episode({
    id,
    ...rest
  }) {
    console.log(`🎬 Fetching Episodes for Season ID: ${id}`);
    try {
      this.headers["x-netflix.context.operation-name"] = "PreviewModalEpisodeSelectorSeasonEpisodes";
      const detailData = await this.detail({
        id: id
      });
      let seasonId = id;
      if (detailData && detailData.length > 0) {
        const entity = detailData[0];
        if (entity.__typename === "Episode" && entity.parentSeason && entity.parentSeason.videoId) {
          seasonId = entity.parentSeason.videoId;
          console.log(`🎞️ Detected episode ${id}, using parent season ID: ${seasonId}`);
        } else if (entity.__typename === "Show") {
          console.log(`⚠️ Warning: ${id} is a Show ID, not a Season ID.`);
          console.log(`ℹ️ To get episodes, first get seasons using season(), then use a season ID.`);
          return {
            error: "ID is a Show, not a Season. Use season() method first."
          };
        }
      }
      const payload = {
        operationName: "PreviewModalEpisodeSelectorSeasonEpisodes",
        variables: {
          seasonId: seasonId,
          count: 100,
          opaqueImageFormat: "JPG",
          artworkContext: {},
          locale: "en-US"
        },
        extensions: {
          persistedQuery: {
            id: "314df063-5a11-4b60-87d5-765ea6e3fc91",
            version: 102
          }
        }
      };
      const response = await this.request(payload);
      return response?.data || {};
    } catch (error) {
      console.log(`❌ Episode failed: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  async download({
    id,
    country = "id",
    ...rest
  }) {
    console.log(`⬇️ Downloading metadata for ID: ${id} (Country: ${country})`);
    try {
      const url = `${this.htmlBase}/${country}/title/${id}?preventIntent=true`;
      const config = {
        method: "GET",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "cache-control": "max-age=0",
          "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-ch-ua-platform-version": '"15.0.0"',
          "sec-ch-ua-model": '"RMX3890"',
          dnt: "1",
          "upgrade-insecure-requests": "1",
          "sec-fetch-site": "none",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "sec-fetch-dest": "document",
          "accept-language": "id,ms;q=0.9,en;q=0.8",
          priority: "u=0, i",
          Cookie: "flwssn=e8bffc88-34bb-48f7-8a1a-bbaa65373c4d; nfvdid=BQFmAAEBEOyzidXaPAA1j8ST-dZVywVAv4pNT1XNXS5-1r7UwgOUx-fWmv5VO22X6BM17glTJSNvfDqGhb9c4aLAJziLKD0uqlvsszecmIQ5ihIDxLNq1Q%3D%3D; SecureNetflixId=v%3D3%26mac%3DAQEAEQABABS03hgdst4o5H_vHcHY4x57uP06a9A9Qvw.%26dt%3D1769399859540; NetflixId=v%3D3%26ct%3DBgjHlOvcAxLAATRGIeMDKP47cDwD867gNIs3w6lZQtrR38tqdpNfYswyU9VV54xU16ruJukyEAcqExVU2wJJmW1vGrh3DzlrZ0futffK2N0IHmQNuuOE4wCYiuWReNVEkMUqzs0gxkWTUEkgDl4enE1XbhMa42drrZ2vH1trvTOgXNpQ0s5YZoJzpvZ9FBs_cLz95FbsobmntyhNafbVDf2PTYP0Zm_6XdNwplfxBAx-0EuW_hRi9HRJXmoXBs-2iBMQh_gZmfCH-xgGIg4KDN2CY4rYhU79OIjc_A..; gsid=ae8f89fe-a502-45a6-ad36-fd0a5e84129a"
        }
      };
      const response = await axios(config);
      const html = response.data;
      const $ = cheerio.load(html);
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      let jsonLd = null;
      if (jsonLdScript) {
        try {
          jsonLd = JSON.parse(jsonLdScript);
        } catch (e) {
          console.log(`⚠️ Failed to parse JSON-LD: ${e.message}`);
        }
      }
      const videoSources = [];
      $("video source").each((i, element) => {
        const src = $(element).attr("src");
        const type = $(element).attr("type");
        if (src) {
          videoSources.push({
            url: src,
            type: type || "unknown",
            index: i
          });
        }
      });
      const reactContextScript = html.match(/window\.netflix\s*=\s*window\.netflix\s*\|\|\s*\{\};\s*netflix\.reactContext\s*=\s*(\{.*?\});/s);
      let reactContext = null;
      if (reactContextScript && reactContextScript[1]) {
        try {
          reactContext = JSON.parse(reactContextScript[1]);
        } catch (e) {
          console.log(`⚠️ Failed to parse reactContext: ${e.message}`);
        }
      }
      const title = $("title").text() || $('meta[property="og:title"]').attr("content");
      const description = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content");
      const image = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
      const metaTags = {};
      $("meta").each((i, element) => {
        const name = $(element).attr("name") || $(element).attr("property");
        const content = $(element).attr("content");
        if (name && content) {
          metaTags[name] = content;
        }
      });
      const contentRating = $('meta[property="og:contentRating"]').attr("content") || $('meta[name="rating"]').attr("content");
      const scriptContents = [];
      $("script").each((i, element) => {
        const scriptContent = $(element).html();
        if (scriptContent && scriptContent.includes("video") || scriptContent.includes("playback")) {
          scriptContents.push({
            index: i,
            content: scriptContent.substring(0, 200) + "..."
          });
        }
      });
      const videoPlayerData = {};
      const videoRegex = /"playbackUrl":"(.*?)"/g;
      const matches = html.match(videoRegex);
      if (matches) {
        videoPlayerData.playbackUrls = matches.map(match => match.replace('"playbackUrl":"', "").replace('"', ""));
      }
      const trailerRegex = /"trailer":\s*(\{.*?\})/s;
      const trailerMatch = html.match(trailerRegex);
      let trailerData = null;
      if (trailerMatch && trailerMatch[1]) {
        try {
          trailerData = JSON.parse(trailerMatch[1]);
        } catch (e) {
          try {
            const fixedJson = trailerMatch[1].replace(/(\w+):/g, '"$1":');
            trailerData = JSON.parse(fixedJson);
          } catch (e2) {
            console.log(`⚠️ Failed to parse trailer data: ${e2.message}`);
          }
        }
      }
      const result = {
        success: true,
        id: id,
        url: url,
        title: title,
        description: description,
        image: image,
        contentRating: contentRating,
        jsonLd: jsonLd,
        videoSources: videoSources,
        trailerData: trailerData,
        reactContext: reactContext ? {
          hasData: true,
          models: Object.keys(reactContext.models || {}),
          esn: reactContext.models?.esnAccessor?.data?.esn
        } : {
          hasData: false
        },
        metaTags: {
          count: Object.keys(metaTags).length,
          important: {
            contentType: metaTags["og:type"] || metaTags["contentType"],
            releaseDate: metaTags["datePublished"] || metaTags["releaseDate"],
            duration: metaTags["duration"] || metaTags["runtime"]
          }
        },
        hasVideo: videoSources.length > 0,
        rawDataAvailable: scriptContents.length > 0
      };
      console.log(`✅ Successfully extracted metadata for "${title || id}"`);
      console.log(`   Found ${videoSources.length} video source(s)`);
      console.log(`   Has JSON-LD: ${!!jsonLd}`);
      return result;
    } catch (error) {
      console.log(`❌ Download failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        id: id
      };
    }
  }
  async getContentType(id) {
    const detailData = await this.detail({
      id: id
    });
    if (detailData && detailData.length > 0) {
      const entity = detailData[0];
      return {
        type: entity.__typename,
        data: entity
      };
    }
    return {
      type: "UNKNOWN",
      data: null
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const valid_actions = ["search", "detail", "season", "episode", "download"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: valid_actions
    });
  }
  const api = new NetflixApi();
  try {
    let response;
    console.log(`[HANDLER] Action: ${action}`);
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.detail(params);
        break;
      case "season":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.season(params);
        break;
      case "episode":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.episode(params);
        break;
      case "download":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: valid_actions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}