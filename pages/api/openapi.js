import apiConfig from "@/configs/apiConfig";
import axios from "axios";
export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/routes`);
    const routes = response.data;
    const tags = {};
    routes.forEach(({
      path,
      name,
      params
    }) => {
      const tag = path.split("/api/")[1]?.split("/")[0]?.toUpperCase();
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push({
        path: path,
        name: name,
        parameters: params.map(({
          name,
          required
        }) => ({
          name: name,
          in: "query",
          required: required,
          schema: {
            type: "string",
            default: "default_value",
            enum: ["option1", "option2", "option3"]
          }
        }))
      });
    });
    const openAPISpec = {
      openapi: "3.0.3",
      info: {
        title: "Generated API Documentation",
        description: "Comprehensive API documentation dynamically generated from available routes.",
        version: "1.0.0",
        contact: {
          name: "API Support",
          url: "https://example.com/support",
          email: "support@example.com"
        },
        license: {
          name: "MIT License",
          url: "https://opensource.org/licenses/MIT"
        }
      },
      externalDocs: {
        description: "Find more info here",
        url: "https://example.com/docs"
      },
      servers: [{
        url: `https://${apiConfig.DOMAIN_URL}`,
        description: "Production Server"
      }, {
        url: "http://localhost:3000",
        description: "Local Development Server"
      }],
      tags: Object.keys(tags).map(tag => ({
        name: tag,
        description: `Operations related to ${tag}`
      })),
      paths: {},
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key"
          },
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        },
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              error: {
                type: "string"
              },
              message: {
                type: "string"
              }
            }
          }
        },
        responses: {
          Success: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                },
                examples: {
                  success: {
                    value: {
                      message: "Operation successful"
                    }
                  }
                }
              }
            }
          },
          Error: {
            description: "Error response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                },
                examples: {
                  error: {
                    value: {
                      error: "Bad Request",
                      message: "Invalid parameters provided"
                    }
                  }
                }
              }
            }
          }
        }
      },
      security: [{
        ApiKeyAuth: []
      }]
    };
    Object.entries(tags).forEach(([tag, endpoints]) => {
      endpoints.forEach(({
        path,
        name,
        parameters
      }) => {
        if (!openAPISpec.paths[path]) openAPISpec.paths[path] = {};
        openAPISpec.paths[path]["get"] = {
          tags: [tag],
          summary: `${name} (GET)`,
          description: `Retrieve data for ${name}.`,
          parameters: parameters,
          responses: {
            200: {
              $ref: "#/components/responses/Success"
            },
            400: {
              $ref: "#/components/responses/Error"
            }
          },
          security: [{
            BearerAuth: []
          }]
        };
        openAPISpec.paths[path]["post"] = {
          tags: [tag],
          summary: `${name} (POST)`,
          description: `Create a new resource for ${name}.`,
          requestBody: {
            description: "Payload to create a resource",
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: parameters.reduce((acc, {
                    name
                  }) => {
                    acc[name] = {
                      type: "string",
                      default: "default_value"
                    };
                    return acc;
                  }, {})
                },
                examples: {
                  examplePayload: {
                    value: {
                      param1: "value1",
                      param2: "value2"
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: "Resource created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object"
                  },
                  examples: {
                    created: {
                      value: {
                        message: "Resource created successfully"
                      }
                    }
                  }
                }
              }
            },
            400: {
              $ref: "#/components/responses/Error"
            }
          }
        };
      });
    });
    return res.status(200).send(JSON.stringify(openAPISpec, null, 2));
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate OpenAPI Specification"
    });
  }
}