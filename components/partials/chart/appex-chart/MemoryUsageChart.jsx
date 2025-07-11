import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";

const MemoryUsageChart = ({ used, total, height = 280 }) => {
  const [isDark] = useDarkMode();

  const parseMemory = (memString) => {
    if (!memString) return 0;
    return parseFloat(memString.replace(" MB", "").replace(" GB", "") * (memString.includes("GB") ? 1024 : 1));
  };

  const usedMb = parseMemory(used);
  const totalMb = parseMemory(total);
  const percentageUsed = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;

  const series = [percentageUsed];
  const options = {
    chart: {
      type: "radialBar",
      offsetY: -20,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: isDark ? "#334155" : "#e2e8f0",
          strokeWidth: "97%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: -2,
            fontSize: "22px",
            color: isDark ? "#CBD5E1" : "#475569",
            fontFamily: "Inter",
          },
        },
      },
    },
    grid: {
      padding: {
        top: -10,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: isDark ? "dark" : "light",
        shadeIntensity: 0.4,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 53, 91],
        colorStops: [
          {
            offset: 0,
            color: "#4669FA",
            opacity: 1
          },
          {
            offset: 100,
            color: "#A046FA",
            opacity: 1
          }
        ]
      },
    },
    labels: ["Usage"],
    colors: ["#4669FA"],
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: function (val) {
          return val + "%";
        }
      }
    }
  };

  return (
    <div>
      <Chart options={options} series={series} type="radialBar" height={height} />
      <div className="text-center -mt-8">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>
          {used} / {total}
        </p>
      </div>
    </div>
  );
};

export default MemoryUsageChart;