"use client";
import Card from "@/components/ui/Card";
import dynamic from "next/dynamic";
const BasicMap = dynamic(() => import("@/components/partials/map/basic-map"), {
  ssr: false,
});
const MarkerMap = dynamic(
  () => import("@/components/partials/map/marker-map"),
  {
    ssr: false,
  }
);
const GeoJSON = dynamic(() => import("@/components/partials/map/GeoJSON"), {
  ssr: false,
});

const VMap = dynamic(() => import("@/components/partials/map/VectoreMap"), {
  ssr: false,
});

const MapPage = () => {
  return (
    <div className=" space-y-5">
      <Card title="Basic Map">
        <BasicMap />
      </Card>
      <Card title="Leaflet Marker, Circle & Polygon Map">
        <MarkerMap />
      </Card>
      <Card title="Leaflet GeoJSON Map">
        <GeoJSON />
      </Card>
      <Card title="React Vector Maps">
        <VMap />
      </Card>
    </div>
  );
};

export default MapPage;
