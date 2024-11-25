export default async function handler(req, res) {
  try {
    const response = await fetch("https://malik-jmk.us.kg/api/routes");
    const routes = await response.json();

    const groupedPaths = routes
      .filter(route => route.path.startsWith("/api"))
      .reduce((acc, route) => {
        const tag = route.path.split("/api/")[1]?.split("/")[0] || "general";
        const capitalizedRouteName = route.name.charAt(0).toUpperCase() + route.name.slice(1);

        if (!acc[tag]) acc[tag] = {};
        acc[tag][route.path] = {
          get: {
            summary: `Retrieve ${capitalizedRouteName}`,
            description: `Fetches the ${capitalizedRouteName} route.`,
            tags: [tag],
            parameters: (route.params || []).map(param => ({
              name: param.name,
              in: "query",
              schema: { type: "string" },
              required: param.required,
              description: `The ${param.name} parameter for ${capitalizedRouteName}`
            })),
            responses: {
              "200": {
                description: `${capitalizedRouteName} route details`,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        path: { type: "string", description: "The route path" },
                        name: { type: "string", description: "The name of the route" },
                        params: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Parameter name" },
                              required: { type: "boolean", description: "Is the parameter required" },
                              in: { type: "string", description: "Location of the parameter" },
                              schema: { type: "object", description: "Schema of the parameter" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };
        return acc;
      }, {});

    const paths = Object.values(groupedPaths).reduce((acc, group) => {
      return { ...acc, ...group };
    }, {});

    const openAPISpec = {
      openapi: "3.0.0",
      info: {
        title: "Dynamic Routes API",
        version: "1.0.0",
        description: "API documentation for routes with dynamic paths, parameters, and tags."
      },
      tags: Object.keys(groupedPaths).map(tag => ({
        name: tag,
        description: `Routes under the "${tag}" tag`
      })),
      paths: paths
    };

    res.status(200).json(openAPISpec);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate OpenAPI spec" });
  }
}
