"use client";

import Card from "@/components/ui/Card";
import BarChart from "@/components/partials/chart/chartjs/Bar";
import HorizontalBar from "@/components/partials/chart/chartjs/HorizontalBar";
import BarStacked from "@/components/partials/chart/chartjs/BarStacked";
import LineChart from "@/components/partials/chart/chartjs/LineChart";
import RadarChart from "@/components/partials/chart/chartjs/RadarChart";
import PollerAreaChart from "@/components/partials/chart/chartjs/PollerAreaChart";

const ChartJs = () => {
  return (
    <div className=" space-y-5">
      <Card title="Bar Chart">
        <BarChart />
      </Card>
      <Card title="Horizontal Bar">
        <HorizontalBar />
      </Card>
      <Card title="Bar Stacked">
        <BarStacked />
      </Card>
      <Card title="Line Chart">
        <LineChart />
      </Card>
      <Card title="Radar Chart">
        <RadarChart />
      </Card>
      <Card title="Poller Area Chart">
        <PollerAreaChart />
      </Card>
    </div>
  );
};

export default ChartJs;
