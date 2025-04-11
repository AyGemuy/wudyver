import { useState, useEffect } from "react";

export default function useWidth() {
  const [width, setWidth] = useState(1920);
  const [breakpoints, setBreakpoints] = useState({
    sm: "640",
    md: "768",
    lg: "1024",
    xl: "1280",
  });

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Check if window is available (SSR)
    if (typeof window !== "undefined") {
      setWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  return { width, breakpoints };
}
