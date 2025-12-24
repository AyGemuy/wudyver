export default async function handler(req, res) {
  const pathSegments = req.query.path || [];
  const requestedPath = pathSegments.join("/");
  const fullPath = `/${requestedPath}`;
  try {
    res.setHeader("Content-Type", "application/json");
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        code: "ROUTE_NOT_FOUND",
        message: `Endpoint ${req.method} ${fullPath} tidak ditemukan.`,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url,
        documentation: [{
          name: "Playground",
          url: "/try-it"
        }, {
          name: "Swagger UI",
          url: "/docs/swagger"
        }, {
          name: "RapiDoc",
          url: "/docs/rapidoc"
        }, {
          name: "Stoplight Elements",
          url: "/docs/stoplight"
        }],
        suggestion: "Cek dokumentasi interaktif di /try-it atau /docs/rapidoc"
      }
    });
  } catch (error) {
    console.error("Internal Server Error while processing 404:", error);
    return res.status(500).json({
      success: false,
      error: {
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal error during 404 processing.",
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url
      }
    });
  }
}