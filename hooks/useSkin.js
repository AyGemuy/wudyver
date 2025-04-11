import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { handleSkin } from "@/store/layoutReducer";

const useSkin = () => {
  const dispatch = useDispatch();
  const skin = useSelector((state) => state.layout.skin);

  const setSkin = (mode) => {
    dispatch(handleSkin(mode));
    localStorage.setItem("skin", JSON.stringify(mode));
  };
  useEffect(() => {
    const storedMode = localStorage.getItem("skin");
    if (storedMode !== null) {
      dispatch(handleSkin(JSON.parse(storedMode)));
    }
  }, []);
  return [skin, setSkin];
};

export default useSkin;
