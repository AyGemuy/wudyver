import {
  Server
} from "socket.io";
import axios from "axios";
let io;
async function fetchAllApiData(host) {
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const apiEndpoints = ["/api/general/system-stats", "/api/user/info", "/api/user/stats", "/api/user/user", "/api/visitor/info", "/api/visitor/stats", "/api/visitor/all", "/api/routes"];
  const results = {};
  for (const path of apiEndpoints) {
    const url = `${baseUrl}${path}`;
    try {
      const endpointName = path.split("/").pop();
      const response = await axios.get(url);
      results[endpointName] = response.data;
    } catch (error) {
      console.error(`Gagal mengambil data dari ${url}:`, error.message);
      results[path] = {
        error: "Failed to fetch data"
      };
    }
  }
  return results;
}
export default async function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: "/api/general/api-stats",
      addTrailingSlash: false
    });
    res.socket.server.io = io;
    io.on("connection", async socket => {
      const host = req.headers.host;
      if (!host) {
        return socket.emit("apiDataComplete", {
          status: "error",
          message: "Host tidak terdefinisi."
        });
      }
      console.log("Klien terhubung. Mengambil semua data API...");
      try {
        const combinedData = await fetchAllApiData(host);
        socket.emit("apiDataComplete", {
          status: "success",
          data: combinedData
        });
        console.log("Data berhasil dikirim ke klien.");
      } catch (error) {
        console.error("Terjadi kesalahan saat mengambil data:", error);
        socket.emit("apiDataComplete", {
          status: "error",
          message: "Gagal mengambil data dari API."
        });
      }
      socket.on("disconnect", () => {
        console.log("Klien terputus.");
      });
    });
  }
  res.end();
}