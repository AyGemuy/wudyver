import os from "os";

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function formatToSnakeCase(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => formatToSnakeCase(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[snakeKey] = formatToSnakeCase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item => typeof item === "object" && item !== null ? formatToSnakeCase(item) : item);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  return {
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: secs,
    formatted: `${days}d ${hours}h ${minutes}m ${secs}s`,
    total_seconds: seconds
  };
}

function getSystemInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercentage = (usedMemory / totalMemory * 100).toFixed(2);
  const uptime = os.uptime();
  const loadAvg = os.loadavg();
  return {
    platform: {
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      version: os.version(),
      endianness: os.endianness()
    },
    host: {
      hostname: os.hostname(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      machine: os.machine?.() || "N/A"
    },
    cpu: {
      cpus: os.cpus().map((cpu, index) => ({
        id: index,
        model: cpu.model.trim(),
        speed: cpu.speed,
        times: {
          user: cpu.times.user,
          nice: cpu.times.nice,
          sys: cpu.times.sys,
          idle: cpu.times.idle,
          irq: cpu.times.irq || 0
        },
        usage: ((cpu.times.user + cpu.times.sys) / (cpu.times.user + cpu.times.sys + cpu.times.idle) * 100).toFixed(2)
      })),
      total_cores: os.cpus().length,
      avg_speed: (os.cpus().reduce((sum, cpu) => sum + cpu.speed, 0) / os.cpus().length).toFixed(2)
    },
    memory: {
      total_memory: totalMemory,
      free_memory: freeMemory,
      used_memory: usedMemory,
      memory_usage_percentage: memoryUsagePercentage,
      formatted: {
        total_memory: formatBytes(totalMemory),
        free_memory: formatBytes(freeMemory),
        used_memory: formatBytes(usedMemory)
      }
    },
    network: {
      network_interfaces: Object.entries(os.networkInterfaces()).reduce((acc, [name, interfaces]) => {
        acc[name] = interfaces.map(intf => ({
          address: intf.address,
          netmask: intf.netmask,
          family: intf.family,
          mac: intf.mac,
          internal: intf.internal,
          cidr: intf.cidr || null,
          scopeid: intf.scopeid || null
        }));
        return acc;
      }, {}),
      total_interfaces: Object.keys(os.networkInterfaces()).length
    },
    system: {
      uptime: uptime,
      uptime_formatted: formatUptime(uptime),
      load_average: {
        "1min": loadAvg[0],
        "5min": loadAvg[1],
        "15min": loadAvg[2],
        formatted: `${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}`
      },
      user_info: {
        username: os.userInfo().username,
        uid: os.userInfo().uid,
        gid: os.userInfo().gid,
        shell: os.userInfo().shell || "N/A",
        homedir: os.userInfo().homedir
      }
    },
    constants: {
      signals: Object.entries(os.constants.signals).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
      priority: Object.entries(os.constants.priority).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {})
    },
    real_time: {
      current_timestamp: Date.now(),
      iso_timestamp: new Date().toISOString(),
      local_timestamp: new Date().toLocaleString(),
      free_memory_current: freeMemory,
      formatted_free_memory: formatBytes(freeMemory)
    },
    metrics: {
      memory: {
        total_gb: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
        free_gb: (freeMemory / 1024 / 1024 / 1024).toFixed(2),
        used_gb: (usedMemory / 1024 / 1024 / 1024).toFixed(2),
        usage_percentage: memoryUsagePercentage
      },
      cpu: {
        total_cores: os.cpus().length,
        avg_speed_mhz: (os.cpus().reduce((sum, cpu) => sum + cpu.speed, 0) / os.cpus().length).toFixed(2),
        avg_speed_ghz: (os.cpus().reduce((sum, cpu) => sum + cpu.speed, 0) / os.cpus().length / 1e3).toFixed(2)
      },
      uptime: formatUptime(uptime)
    },
    environment: {
      node_version: process.version,
      node_versions: process.versions,
      platform: process.platform,
      pid: process.pid,
      ppid: process.ppid,
      argv: process.argv,
      exec_path: process.execPath,
      exec_argv: process.execArgv,
      cwd: process.cwd()
    }
  };
}
export default function handler(req, res) {
  try {
    const systemInfo = getSystemInfo();
    const formattedInfo = formatToSnakeCase(systemInfo);
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      response_time: Date.now() - (req.startTime || Date.now()),
      data: formattedInfo,
      metadata: {
        api_version: "1.0.0",
        endpoint: "/api/general/os",
        method: "GET",
        node_version: process.version,
        platform: process.platform,
        memory_usage: formatToSnakeCase(process.memoryUsage()),
        uptime: process.uptime()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in system-info API:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}