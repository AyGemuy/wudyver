import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const generateShape = (color = "#00EBFF") => {
  return {
    series: [
      {
        data: Array.from({ length: 8 }, () => Math.floor(Math.random() * 1000 + 500)), // dummy trend
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
            count: systemData?.Statistik?.Memory?.used ?? "N/A",
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

        // Tambahkan chart shape
        const withChart = stats.map((item) => ({
          ...item,
          shape: generateShape(item.color),
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
              <Chart
                options={item.shape.options}
                series={item.shape.series}
                type="area"
                height={48}
                width={48}
              />
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
