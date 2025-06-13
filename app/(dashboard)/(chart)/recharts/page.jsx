"use client";

import Card from "@/components/ui/Card";
import ReLineChart from "@/components/partials/chart/recharts/ReLineChart";
import ReAreaChart from "@/components/partials/chart/recharts/ReAreaChart";
import ReBarChart from "@/components/partials/chart/recharts/ReBarChart";
import ReScatterChart from "@/components/partials/chart/recharts/ScatterChart";
import ReRadarChart from "@/components/partials/chart/recharts/ReRadarChart";
import RePieChart from "@/components/partials/chart/recharts/RePieChart";

const ChartJs = () => {
  return (
    <div className=" space-y-5">
      <Card title="Line Chart">
        <ReLineChart />
      </Card>
      <Card title="Area Chart">
        <ReAreaChart />
      </Card>
      <Card title="Bar Chart">
        <ReBarChart />
      </Card>
      <Card title="Scatter Chart">
        <ReScatterChart />
      </Card>
      <Card title="Radar Chart">
        <ReRadarChart />
      </Card>
      <Card title="Pie Chart">
        <RePieChart />
      </Card>
    </div>
  );
};

export default ChartJs;
