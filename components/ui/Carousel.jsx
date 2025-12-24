import React from "react";
import { Swiper } from "swiper/react";

// Import Swiper modules from 'swiper/modules'
import {
  EffectFade,
  Pagination,
  Autoplay,
  Navigation,
  EffectCards,
} from "swiper/modules"; // <-- FIX IS HERE!

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/scrollbar"; // Make sure you need this if not using Scrollbar module
import "swiper/css/effect-cards";
import "swiper/css/effect-fade"; // <-- Add CSS for EffectFade

const Carousel = ({
  spaceBetween = 20,
  slidesPerView = 1,
  onSlideChange = () => {},
  onSwiper,
  children,
  pagination,
  className = "main-caro",
  navigation,
  autoplay,
  effect,
}) => {
  return (
    <div>
      <Swiper
        spaceBetween={spaceBetween}
        slidesPerView={slidesPerView}
        onSlideChange={onSlideChange}
        onSwiper={onSwiper}
        // Ensure all imported modules are passed to the `modules` prop
        modules={[Pagination, Navigation, Autoplay, EffectFade, EffectCards]}
        pagination={pagination}
        navigation={navigation}
        className={className}
        autoplay={autoplay}
        effect={effect}
      >
        {children}
      </Swiper>
    </div>
  );
};

export default Carousel;