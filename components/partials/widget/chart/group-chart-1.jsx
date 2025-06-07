import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const generateShape = (data, color = "#00EBFF") => {
  const baseValue = data[Math.floor(data.length / 2)]; // Ambil nilai tengah sebagai acuan
  const multiplier = baseValue > 0 ? 1 : 0.1; // Hindari perkalian dengan nol
  const trendData = data.map((_, index) => {
    const fluctuation = Math.random() * multiplier * baseValue * 0.2; // Variasi kecil
    const direction = Math.random() > 0.5 ? 1 : -1;
    const point = baseValue + direction * fluctuation * (index - Math.floor(data.length / 2));
    return Math.max(50, Math.floor(point)); // Pastikan nilai tidak terlalu kecil
  });

  return {
    series: [
      {
        data: trendData,
      },
    ],
    options: {
      chart: {
        toolbar: { autoSelected: "pan", show: false },
        offsetX: 0,
        offsetY: 0,
        zoom: { enabled: false },
        sparkline: { enabled: true },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      colors: [color],
      tooltip: { theme: "light" },
      grid: { show: false, padding: { left: 0, right: 0 } },
      yaxis: { show: false },
      fill: { type: "solid", opacity: [0.1] },
      legend: { show: false },
      xaxis: {
        show: false,
        labels: { show: false },
        axisBorder: { show: false },
      },
    },
  };
};

const GroupChart1 = () => {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [userData, visitorData, systemData] = await Promise.all([
          fetchData("/api/user/stats"),
          fetchData("/api/visitor/stats"),
          fetchData("/api/general/system-stats"),
        ]);

        const totalRoutes = systemData?.TotalRoute ?? 0;

        const stats = [
          {
            title: "Request Count",
            count: visitorData?.requestCount ?? 0,
            color: "#00EBFF",
            bg: "bg-[#E5F9FF] dark:bg-slate-900",
          },
          {
            title: "Total Visitors",
            count: visitorData?.visitorCount ?? 0,
            color: "#FB8F65",
            bg: "bg-[#FFEDE5] dark:bg-slate-900",
          },
          {
            title: "Total Users",
            count: userData?.userCount ?? 0,
            color: "#5743BE",
            bg: "bg-[#EAE5FF] dark:bg-slate-900",
          },
          {
            title: "System Uptime",
            count: systemData?.Statistik?.Uptime ?? "-",
            color: "#00C49F",
            bg: "bg-[#E0FFF8] dark:bg-slate-900",
          },
          {
            title: "Memory Usage",
            // Asumsi data Memory Usage perlu diolah jika formatnya string dengan satuan
            count: systemData?.Statistik?.Memory?.used ? parseInt(systemData.Statistik.Memory.used) : "N/A",
            color: "#FFBB28",
            bg: "bg-[#FFF7E0] dark:bg-slate-900",
          },
          {
            title: "Total Routes",
            count: totalRoutes,
            color: "#FF6699",
            bg: "bg-[#FFE0EB] dark:bg-slate-900",
          },
        ];

        // Tambahkan chart shape berdasarkan count
        const withChart = stats.map((item) => ({
          ...item,
          shape: generateShape(Array(8).fill(Number(item.count)), item.color), // Buat array dengan nilai count
        }));

        setStatsData(withChart);
      } catch (err) {
        console.error("Gagal mengambil statistik:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async (url) => {
      try {
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    fetchStats();
  }, []);

  if (loading) return <p>Loading chart...</p>;

  return (
    <>
      {statsData.map((item, i) => (
        <div className={`py-[18px] px-4 rounded-[6px] ${item.bg}`} key={i}>
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="flex-none">
              {item.count !== "N/A" && item.count !== "-" ? (
                <Chart
                  options={item.shape.options}
                  series={item.shape.series}
                  type="area"
                  height={48}
                  width={48}
                />
              ) : (
                <div className="w-[48px] h-[48px] flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
                  -
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-slate-800 dark:text-slate-300 text-sm mb-1 font-medium">
                {item.title}
              </div>
              <div className="text-slate-900 dark:text-white text-lg font-medium">
                {item.count}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default GroupChart1;