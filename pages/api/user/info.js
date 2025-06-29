import uaParser from "ua-parser-js";
let requestLogs = {};
export default async function handler(req, res) {
  const fwd = req.headers["x-forwarded-for"];
  const fwdIps = fwd ? fwd.split(",").map(x => x.trim()) : [];
  const real = req.connection?.remoteAddress || req.socket?.remoteAddress || req.connection?.socket?.remoteAddress || "unknown";
  const ip = {
    real: real
  };
  fwdIps.forEach((x, i) => ip[`forwarded_${i + 1}`] = x);
  const allIps = Object.values(ip);
  const primary = fwdIps[0] || real;
  const now = Date.now();
  requestLogs[primary] = (requestLogs[primary] || []).filter(t => now - t < 6e4).concat(now);
  const isDDoS = requestLogs[primary].length > 30;
  const ua = req.headers["user-agent"] || "unknown";
  const parsedUA = uaParser(ua);
  let geo = null;
  try {
    const r = await fetch(`https://ipwhois.app/json/${primary}`);
    geo = await r.json();
  } catch {}
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    ip: ip,
    ipCount: allIps.length,
    primaryIP: primary,
    isPotentialDDoS: isDDoS,
    requestCountLastMinute: requestLogs[primary].length,
    geo: geo ? {
      ip: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone_gmt,
      org: geo.org,
      isp: geo.isp,
      connectionType: geo.connection_type,
      asn: geo.asn,
      continent: geo.continent
    } : "geo lookup failed",
    userAgent: ua,
    device: {
      browser: parsedUA.browser.name || "unknown",
      browserVersion: parsedUA.browser.version || "unknown",
      os: parsedUA.os.name || "unknown",
      osVersion: parsedUA.os.version || "unknown",
      deviceModel: parsedUA.device.model || "unknown",
      deviceType: parsedUA.device.type || "unknown",
      deviceVendor: parsedUA.device.vendor || "unknown"
    }
  });
}