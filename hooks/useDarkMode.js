import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { handleDarkMode } from "@/store/layoutReducer";

const useDarkmode = () => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.layout.darkMode);

  const setDarkMode = (mode) => {
    dispatch(handleDarkMode(mode));
    localStorage.setItem("darkMode", JSON.stringify(mode));
  };

  useEffect(() => {
    const storedDarkMode = localStorage.getItem("darkMode");
    if (storedDarkMode !== null) {
      dispatch(handleDarkMode(JSON.parse(storedDarkMode)));
    }
  }, []);

  return [isDark, setDarkMode];
};

export default useDarkmode;
