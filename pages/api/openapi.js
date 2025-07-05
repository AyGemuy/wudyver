import apiConfig from "@/configs/apiConfig";
import axios from "axios";
export default async function handler(req, res) {
  const domainName = apiConfig.DOMAIN_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  try {
    const response = await axios.get(`https://${domainName}/api/routes`);
    const routes = response.data;
    const tags = {};
    const schemas = {
      [`${domainName.replace(/\./g, "")}ApiResponse`]: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Status operasi (misalnya, success, error, pending).",
            enum: ["success", "error", "processing"],
            default: "success"
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Stempel waktu UTC saat respons dibuat."
          },
          payload: {
            type: "object",
            description: "Muatan utama dari respons data."
          },
          message: {
            type: "string",
            description: "Pesan yang mudah dibaca tentang operasi."
          },
          [`${domainName.replace(/\./g, "")}TraceId`]: {
            type: "string",
            format: "uuid",
            description: `Pengidentifikasi unik untuk melacak transaksi terdistribusi dalam ekosistem ${domainName}.`,
            readOnly: true
          },
          processingTimeMs: {
            type: "integer",
            description: "Waktu pemrosesan di sisi server dalam milidetik.",
            readOnly: true
          }
        },
        required: ["status", "timestamp", "payload"]
      },
      [`${domainName.replace(/\./g, "")}ErrorResponse`]: {
        type: "object",
        properties: {
          errorCode: {
            type: "integer",
            format: "int32",
            description: `Kode error spesifik aplikasi dari ${domainName}.`,
            example: 1001
          },
          errorMessage: {
            type: "string",
            description: `Pesan error terperinci dari sistem ${domainName}.`,
            example: "Permintaan tidak dapat diproses. Konfigurasi data tidak valid."
          },
          errorDetails: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description: "Bidang yang terkait dengan error."
                },
                issue: {
                  type: "string",
                  description: "Masalah spesifik yang terdeteksi."
                },
                suggestedAction: {
                  type: "string",
                  description: "Tindakan yang disarankan untuk mengatasi masalah."
                }
              }
            },
            description: "Masalah spesifik terkait permintaan (misalnya, error validasi)."
          },
          correlationId: {
            type: "string",
            format: "uuid",
            description: `ID korelasi unik untuk membantu debugging error di sistem ${domainName}.`,
            readOnly: true
          }
        },
        required: ["errorCode", "errorMessage"]
      },
      [`${domainName.replace(/\./g, "")}GenericSuccess`]: {
        type: "object",
        properties: {
          confirmationMessage: {
            type: "string",
            description: `Pesan konfirmasi bahwa operasi berhasil diselesaikan oleh ${domainName}.`,
            example: `Operasi berhasil diselesaikan oleh ${domainName}.`
          },
          resourceId: {
            type: "string",
            description: "ID sumber daya yang baru dibuat atau dimodifikasi, jika berlaku.",
            nullable: true
          },
          statusLink: {
            type: "string",
            format: "url",
            description: "Tautan untuk memeriksa status sumber daya atau operasi ini.",
            nullable: true
          }
        }
      }
    };
    routes.forEach(({
      path,
      name,
      method,
      params,
      responseSchema,
      requestSchema
    }) => {
      const tag = path.split("/api/")[1]?.split("/")[0]?.toUpperCase() || "GENERAL";
      if (!tags[tag]) tags[tag] = [];
      const openAPIParameters = (params || []).map(({
        name: paramName,
        required,
        type,
        description,
        example,
        enum: paramEnum,
        in: paramIn = "query"
      }) => ({
        name: paramName,
        in: paramIn,
        required: required,
        description: description || `Parameter esensial untuk operasi '${name}'.`,
        schema: {
          type: type || "string",
          default: `sample_${paramName}_value`,
          ...paramEnum && {
            enum: paramEnum
          }
        },
        ...example && {
          example: example
        }
      }));
      if (responseSchema && !schemas[responseSchema.name]) {
        schemas[responseSchema.name] = responseSchema.definition;
      }
      if (requestSchema && !schemas[requestSchema.name]) {
        schemas[requestSchema.name] = requestSchema.definition;
      }
      tags[tag].push({
        path: path,
        name: name,
        method: method ? method.toLowerCase() : "get",
        parameters: openAPIParameters,
        responseSchema: responseSchema?.name,
        requestSchema: requestSchema?.name
      });
    });
    const openAPISpec = {
      openapi: "3.1.0",
      info: {
        title: `${domainName} REST API Documentation - Unsecured Access`,
        description: `**Selamat datang di ${domainName} REST API!** Dokumen ini menyediakan gambaran umum yang dihasilkan secara otomatis dan komprehensif dari semua titik akhir yang tersedia untuk ${domainName}.
        \n\nDidesain untuk prototipe cepat dan akses data terbuka, versi ini beroperasi secara eksplisit tanpa langkah-langkah keamanan.
        Jelajahi kemampuan platform ${domainName} dengan akses tanpa batas!
        \n\n_Catatan: API ini hanya untuk tujuan demonstrasi dan akses data terbuka. Untuk produksi, lapisan keamanan sangat penting._`,
        version: "1.0.0-beta.release",
        contact: {
          name: `Tim ${domainName}`,
          url: `https://${domainName}/support`,
          email: `support@${domainName}.com`
        },
        license: {
          name: `${domainName} Public Data License`,
          url: `https://${domainName}/licenses`
        },
        termsOfService: `https://${domainName}/terms-of-service`
      },
      externalDocs: {
        description: `Pelajari lebih lanjut tentang ${domainName}`,
        url: `https://${domainName}/author`
      },
      servers: [{
        url: `https://${domainName}`,
        description: `${domainName} Production API (${domainName}) - Akses Terbuka`,
        variables: {}
      }],
      tags: Object.keys(tags).map(tag => ({
        name: tag,
        description: `Operasi terkait dengan **modul ${tag}** dari ${domainName} API.`,
        "x-component-group": `${domainName} Modules`
      })),
      paths: {},
      components: {
        schemas: schemas,
        responses: {
          [`${domainName.replace(/\./g, "")}Success`]: {
            description: `Operasi berhasil dengan struktur respons API standar ${domainName}.`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainName.replace(/\./g, "")}ApiResponse`,
                  properties: {
                    payload: {
                      type: "object",
                      description: "Muatan data generik untuk respons yang berhasil."
                    }
                  }
                },
                examples: {}
              }
            }
          },
          [`${domainName.replace(/\./g, "")}BadRequest`]: {
            description: `Permintaan tidak dapat dipahami atau salah format oleh sistem ${domainName}.`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainName.replace(/\./g, "")}ErrorResponse`
                },
                examples: {}
              }
            }
          },
          [`${domainName.replace(/\./g, "")}NotFound`]: {
            description: `Sumber daya yang diminta tidak ditemukan di dalam sistem ${domainName}.`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainName.replace(/\./g, "")}ErrorResponse`
                },
                examples: {}
              }
            }
          },
          [`${domainName.replace(/\./g, "")}InternalServerError`]: {
            description: `Terjadi error tak terduga di server ${domainName}.`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainName.replace(/\./g, "")}ErrorResponse`
                },
                examples: {}
              }
            }
          },
          [`${domainName.replace(/\./g, "")}Accepted`]: {
            description: `Permintaan diterima untuk pemrosesan asinkron oleh ${domainName}.`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${domainName.replace(/\./g, "")}GenericSuccess`,
                  properties: {
                    jobId: {
                      type: "string",
                      format: "uuid",
                      description: `ID untuk melacak tugas asinkron di ${domainName}.`
                    },
                    statusUrl: {
                      type: "string",
                      format: "url",
                      description: `URL untuk memeriksa status tugas asinkron di ${domainName}.`
                    }
                  }
                },
                examples: {}
              }
            }
          }
        }
      },
      security: []
    };
    Object.entries(tags).forEach(([tag, endpoints]) => {
      endpoints.forEach(({
        path,
        name,
        method,
        parameters,
        responseSchema,
        requestSchema
      }) => {
        if (!openAPISpec.paths[path]) openAPISpec.paths[path] = {};
        const operationObject = {
          tags: [tag],
          summary: `${name} (${method.toUpperCase()}) - ${domainName} Operation`,
          description: `Mulai operasi **${method.toUpperCase()}** untuk sumber daya '${name}' melalui ${domainName} REST API. Titik akhir ini dirancang untuk interaksi data yang cepat dan tanpa keamanan.`,
          parameters: parameters,
          responses: {
            200: {
              $ref: `#/components/responses/${domainName.replace(/\./g, "")}Success`
            },
            400: {
              $ref: `#/components/responses/${domainName.replace(/\./g, "")}BadRequest`
            },
            404: {
              $ref: `#/components/responses/${domainName.replace(/\./g, "")}NotFound`
            },
            500: {
              $ref: `#/components/responses/${domainName.replace(/\./g, "")}InternalServerError`
            },
            202: {
              $ref: `#/components/responses/${domainName.replace(/\./g, "")}Accepted`
            }
          }
        };
        if (["post", "put", "patch"].includes(method)) {
          operationObject.requestBody = {
            description: `Muatan data untuk operasi ${method.toUpperCase()} yang akan diproses oleh ${domainName}.`,
            required: true,
            content: {
              "application/json": {
                schema: requestSchema ? {
                  $ref: `#/components/schemas/${requestSchema}`
                } : {
                  type: "object",
                  properties: parameters.reduce((acc, {
                    name: paramName,
                    schema
                  }) => {
                    if (paramName && schema) {
                      acc[paramName] = {
                        type: schema.type || "string",
                        default: `sample_data_for_${paramName}`,
                        description: `Nilai contoh untuk ${paramName}.`,
                        ...schema.enum && {
                          enum: schema.enum
                        }
                      };
                    }
                    return acc;
                  }, {})
                },
                examples: {}
              }
            }
          };
          operationObject.responses[method === "post" ? 201 : 200] = {
            $ref: `#/components/responses/${domainName.replace(/\./g, "")}Success`,
            description: method === "post" ? `Sumber daya berhasil dibuat di ${domainName}.` : `Sumber daya berhasil diperbarui di ${domainName}.`,
            ...responseSchema && {
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/${responseSchema}`
                  }
                }
              }
            }
          };
        }
        openAPISpec.paths[path][method] = operationObject;
      });
    });
    return res.status(200).json(openAPISpec);
  } catch (error) {
    console.error(`Gagal menghasilkan Spesifikasi OpenAPI ${domainName}:`, error);
    res.status(500).json({
      errorCode: 5001,
      errorMessage: `Gagal menghasilkan Spesifikasi OpenAPI ${domainName}. Periksa log server untuk detail.`,
      details: [{
        field: "internal",
        issue: error.message || "Error tidak diketahui selama pembuatan spesifikasi."
      }],
      correlationId: `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    });
  }
}