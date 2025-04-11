import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { handleMonoChrome } from "@/store/layoutReducer";

const useMonoChrome = () => {
  const dispatch = useDispatch();
  const isMonoChrome = useSelector((state) => state.layout.isMonochrome);

  const setMonoChrome = (val) => {
    dispatch(handleMonoChrome(val));
    localStorage.setItem("monochrome", JSON.stringify(val));
  };

  useEffect(() => {
    const storedMode = localStorage.getItem("monochrome");
    if (storedMode !== null) {
      dispatch(handleMonoChrome(JSON.parse(storedMode)));
    }
  }, []);

  return [isMonoChrome, setMonoChrome];
};

export default useMonoChrome;
