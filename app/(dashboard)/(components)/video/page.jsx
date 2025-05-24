"use client";
import VideoPlayer from "@/components/ui/VideoPlayer";
import Card from "@/components/ui/Card";

const VideoPage = () => {
  return (
    <Card title="Video">
      <VideoPlayer url="https://vjs.zencdn.net/v/oceans.mp4" />
    </Card>
  );
};

export default VideoPage;
