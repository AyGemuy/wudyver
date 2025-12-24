import apiConfig from "@/configs/apiConfig";
import axios from "axios";
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  try {
    const domainName = apiConfig.DOMAIN_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const axiosInstance = axios.create({
      timeout: 5e3,
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip"
      }
    });
    const response = await axiosInstance.get(`https://${domainName}/api/routes`);
    const routes = response.data;
    const domainKey = domainName.replace(/\./g, "");
    const tags = {};
    const schemas = {
      [`${domainKey}ApiResponse`]: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["success", "error", "processing"],
            description: "Status operasi"
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Stempel waktu UTC"
          },
          payload: {
            type: "object",
            description: "Muatan data respons"
          },
          message: {
            type: "string",
            description: "Pesan informatif"
          },
          processingTimeMs: {
            type: "integer",
            description: "Waktu pemrosesan (ms)"
          }
        },
        required: ["status", "timestamp", "payload"]
      },
      [`${domainKey}ErrorResponse`]: {
        type: "object",
        properties: {
          errorCode: {
            type: "integer",
            description: "Kode error"
          },
          errorMessage: {
            type: "string",
            description: "Deskripsi error"
          },
          errorDetails: {
            type: "array",
            description: "Detail error",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string"
                },
                issue: {
                  type: "string"
                }
              }
            }
          }
        },
        required: ["errorCode", "errorMessage"]
      }
    };
    const getFolderIcon = folderName => {
      const iconMap = {
        ai: "🤖",
        auth: "🔐",
        "auth-v2": "🔒",
        film: "🎬",
        general: "🌐",
        info: "ℹ️",
        maker: "🛠️",
        nsfw: "🔞",
        other: "📦",
        random: "🎲",
        search: "🔍",
        stalker: "👁️",
        "top-up": "💰",
        anime: "🎌",
        canvas: "🎨",
        download: "📥",
        game: "🎮",
        gpt: "🧠",
        islami: "☪️",
        mails: "✉️",
        misc: "📋",
        news: "📰",
        quotes: "💬",
        sound: "🔊",
        tools: "🛠️",
        user: "👤",
        apps: "📱",
        fun: "🎉",
        visitor: "👣",
        default: "🔗"
      };
      const normalized = folderName.toLowerCase().trim();
      return iconMap[normalized] || iconMap["default"];
    };
    routes.forEach(({
      path,
      name,
      method,
      params
    }) => {
      const pathParts = path.split("/").filter(part => part !== "");
      const folderName = pathParts.length > 1 && pathParts[0] === "api" ? pathParts[1] : "general";
      const tag = folderName.toUpperCase();
      if (!tags[tag]) tags[tag] = [];
      const parameters = (params || []).map(({
        name: paramName,
        required,
        type,
        description,
        example
      }) => ({
        name: paramName,
        in: "query",
        required: required,
        description: description || `Paramenter untuk '${name}'`,
        schema: {
          type: type || "string"
        },
        example: example || `sample_${paramName}`
      }));
      tags[tag].push({
        path: path,
        name: name,
        method: method ? method.toLowerCase() : "get",
        parameters: parameters,
        folder: folderName
      });
    });
    const openAPISpec = {
      openapi: "3.0.0",
      info: {
        title: `${domainName} API • Futuristic Edition`,
        description: `## Next-Gen API Experience\n\n**${domainName} API** dengan desain minimalis dan pengalaman futuristik.\n\n### Fitur Unggulan:\n- Minimalis & Efisien - Antarmuka yang bersih dan mudah digunakan\n- Performansi Tinggi - Respon cepat dan optimal\n- Fokus Konten - Informasi penting yang mudah dicari\n- Desain Futuristik - Pengalaman visual yang modern\n\n> API ini didesain untuk pengembangan cepat dan integrasi yang mudah`,
        version: "3.0.0",
        contact: {
          name: `Tim ${domainName}`,
          url: `https://${domainName}/support`,
          email: `support@${domainName}`
        }
      },
      servers: [{
        url: `https://${domainName}`,
        description: `${domainName} Production Server`
      }],
      tags: Object.keys(tags).map(tag => {
        const folderName = tags[tag][0]?.folder || "general";
        return {
          name: `${getFolderIcon(folderName)} ${tag}`,
          description: `Operasi terkait dengan modul ${tag.toLowerCase()}`
        };
      }),
      paths: {},
      components: {
        schemas: schemas,
        responses: {
          Success: {
            description: "Operasi berhasil",
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainKey}ApiResponse`
                }
              }
            }
          },
          Error: {
            description: "Terjadi kesalahan",
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainKey}ErrorResponse`
                }
              }
            }
          },
          NotFound: {
            description: "Data tidak ditemukan",
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainKey}ErrorResponse`
                }
              }
            }
          }
        },
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API Key Authentication"
          }
        }
      },
      security: [{
        ApiKeyAuth: []
      }]
    };
    const getMethodEmoji = method => {
      const emojiMap = {
        get: "📥",
        post: "📤",
        put: "🔄",
        delete: "🗑️",
        patch: "🔧"
      };
      return emojiMap[method] || "🔗";
    };
    Object.entries(tags).forEach(([originalTag, endpoints]) => {
      const folderName = endpoints[0]?.folder || "general";
      const tag = `${getFolderIcon(folderName)} ${originalTag}`;
      endpoints.forEach(({
        path,
        name,
        method,
        parameters
      }) => {
        if (!openAPISpec.paths[path]) openAPISpec.paths[path] = {};
        openAPISpec.paths[path][method] = {
          tags: [tag],
          summary: `${getMethodEmoji(method)} ${name}`,
          description: `**${method.toUpperCase()}** operation for ${name}\n\n> Endpoint yang dirancang untuk performa optimal dan pengalaman developer yang unggul`,
          parameters: parameters,
          responses: {
            200: {
              $ref: "#/components/responses/Success"
            },
            400: {
              $ref: "#/components/responses/Error"
            },
            404: {
              $ref: "#/components/responses/NotFound"
            },
            500: {
              $ref: "#/components/responses/Error"
            }
          }
        };
      });
    });
    return res.status(200).json(openAPISpec);
  } catch (error) {
    console.error("Failed to generate OpenAPI spec:", error);
    res.status(500).json({
      errorCode: 5001,
      errorMessage: "Gagal menghasilkan spesifikasi OpenAPI"
    });
  }
}