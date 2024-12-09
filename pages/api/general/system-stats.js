export default function handler(req, res) {
  try {
    const stats = {
      Memory: {
        total: formatBytes(process.memoryUsage().heapTotal),
        free: formatBytes(process.memoryUsage().heapUsed),
        used: formatBytes(process.memoryUsage().heapTotal - process.memoryUsage().heapUsed),
      },
      Uptime: formatUptime(process.uptime()),
      Platform: process.platform,
      Architecture: process.arch,
      NodeVersion: process.version,
    };

    res.status(200).json({ Statistik: stats });
  } catch (error) {
    console.error('Error loading system stats:', error);
    res.status(500).json({ Pesan: 'Terjadi kesalahan saat memuat data sistem.' });
  }
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}
