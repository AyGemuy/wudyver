import {
  useSelector,
  useDispatch
} from "react-redux";
import {
  handleContentWidth
} from "@/store/layoutReducer";
const useContentWidth = () => {
  const dispatch = useDispatch();
  const contentWidth = useSelector(state => state.layout.contentWidth);
  const setContentWidth = val => dispatch(handleContentWidth(val));
  return [contentWidth, setContentWidth];
};
export default useContentWidth;