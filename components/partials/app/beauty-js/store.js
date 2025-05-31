import {
  createSlice
} from "@reduxjs/toolkit";
import {
  toast
} from "react-toastify";
const beautySlice = createSlice({
  name: "beauty",
  initialState: {
    url: "",
    loading: false
  },
  reducers: {
    setUrl: (state, action) => {
      state.url = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});
export const {
  setUrl,
  setLoading
} = beautySlice.actions;
export const beautifyZip = url => async dispatch => {
  dispatch(setLoading(true));
  try {
    const res = await fetch(`/api/tools/beauty-js?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`Gagal: ${res.statusText}`);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Beautified.zip";
    link.click();
    toast.success("Download berhasil!");
  } catch (err) {
    toast.error(`Gagal memproses: ${err.message}`);
    console.error("Beautify failed:", err);
  } finally {
    dispatch(setLoading(false));
  }
};
export default beautySlice.reducer;