import axios from "axios";

export default async function handler(req, res) {
  try {
    const response = await axios.get(`https://${process.env.DOMAIN_URL}/api/routes`);
    const routes = response.data;

    const tags = {};
    routes.forEach(({ path, name, params }) => {
      const tag = path.split('/api/')[1]?.split('/')[0]?.toUpperCase();
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push({
        path,
        name,
        parameters: params.map(({ name, required }) => ({
          name,
          in: "query",
          required,
          schema: { type: "string" },
        })),
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
          email: "support@example.com",
        },
        license: {
          name: "MIT License",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        { url: `https://${process.env.DOMAIN_URL}`, description: "Production Server" },
        { url: "http://localhost:3000", description: "Local Development Server" },
      ],
      tags: Object.keys(tags).map((tag) => ({
        name: tag,
        description: `Operations related to ${tag}`,
      })),
      paths: {},
      components: {
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        responses: {
          Success: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          Error: {
            description: "Error response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    };

    Object.entries(tags).forEach(([tag, endpoints]) => {
      endpoints.forEach(({ path, name, parameters }) => {
        if (!openAPISpec.paths[path]) openAPISpec.paths[path] = {};

        openAPISpec.paths[path]["get"] = {
          tags: [tag],
          summary: `${name} (GET)`,
          description: `Retrieve data for ${name}.`,
          parameters,
          responses: {
            200: { $ref: "#/components/responses/Success" },
            400: { $ref: "#/components/responses/Error" },
          },
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
                  properties: parameters.reduce((acc, { name }) => {
                    acc[name] = { type: "string" };
                    return acc;
                  }, {}),
                },
              },
            },
          },
          responses: {
            201: { description: "Resource created successfully" },
            400: { $ref: "#/components/responses/Error" },
          },
        };
      });
    });

    res.status(200).send(JSON.stringify(openAPISpec, null, 2));
  } catch (error) {
    res.status(500).json({ error: "Failed to generate OpenAPI Specification" });
  }
}
