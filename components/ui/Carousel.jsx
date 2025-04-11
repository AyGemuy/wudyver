import React from "react";
import { Swiper } from "swiper/react";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/scrollbar";
import "swiper/css/effect-cards";
import {
  EffectFade,
  Pagination,
  Autoplay,
  Navigation,
  EffectCards,
} from "swiper";

import "swiper/css";
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
