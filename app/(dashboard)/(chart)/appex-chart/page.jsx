"use client";

import React from "react";
import Card from "@/components/ui/Card";
import BasicArea from "@/components/partials/chart/appex-chart/BasicArea";
import AreaSpaline from "@/components/partials/chart/appex-chart/AreaSpaline";
import BasicBar from "@/components/partials/chart/appex-chart/Basicbar";
import Column from "@/components/partials/chart/appex-chart/HorizontalBar";
import Bubble from "@/components/partials/chart/appex-chart/Bubble";
import Scatter from "@/components/partials/chart/appex-chart/Scatter";
import Candlestick from "@/components/partials/chart/appex-chart/Candlestick";
import Stepline from "@/components/partials/chart/appex-chart/Stepline";
import Stacked from "@/components/partials/chart/appex-chart/Stacked";
import Pie from "@/components/partials/chart/appex-chart/Pie";
import Donut from "@/components/partials/chart/appex-chart/Donut";
import MixedChart from "@/components/partials/chart/appex-chart/Mixed";
import Radar from "@/components/partials/chart/appex-chart/Radar";
import Radialbars from "@/components/partials/chart/appex-chart/Radialbars";

const AppexChartPage = () => {
  return (
    <div className=" space-y-5">
      <Card title="Area Chart">
        <BasicArea />
      </Card>
      <Card title="Area Chart">
        <AreaSpaline />
      </Card>
      <Card title="Basic Bar Chart">
        <BasicBar />
      </Card>
      <Card title="Column Chart">
        <Column />
      </Card>
      <Card title="3D Bubble">
        <Bubble />
      </Card>
      <Card title="Scatter Chart">
        <Scatter />
      </Card>
      <Card title="Candlestick Chart">
        <Candlestick />
      </Card>
      <Card title="Stepline Chart">
        <Stepline />
      </Card>
      <Card title="Stacked Columns">
        <Stacked />
      </Card>
      <Card title="Pie & Donut Chart">
        <div className="grid xl:grid-cols-2 grid-cols-1 gap-5">
          <div>
            <Donut />
          </div>
          <div>
            <Pie />
          </div>
        </div>
      </Card>
      <Card title="Mixed Chart">
        <MixedChart />
      </Card>
      <Card title="Radar Chart">
        <Radar />
      </Card>
      <Card title="Multiple Radialbars">
        <Radialbars />
      </Card>
    </div>
  );
};

export default AppexChartPage;
