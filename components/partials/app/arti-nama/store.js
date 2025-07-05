import {
  createSlice,
  createAsyncThunk
} from "@reduxjs/toolkit";
export const fetchArtiNama = createAsyncThunk("artinama/fetchArtiNama", async (nama, {
  rejectWithValue
}) => {
  try {
    const res = await fetch(`/api/other/artinama?nama=${nama}`);
    const data = await res.json();
    if (data.success && data.result.status) {
      return {
        arti: data.result.message.arti,
        catatan: data.result.message.catatan || ""
      };
    } else {
      return rejectWithValue("Nama tidak ditemukan atau terjadi kesalahan");
    }
  } catch (err) {
    return rejectWithValue("Terjadi kesalahan dalam mengambil data");
  }
});
const artinamaSlice = createSlice({
  name: "artinama",
  initialState: {
    nama: "",
    artinama: "",
    catatan: "",
    loading: false,
    error: null,
    copied: false
  },
  reducers: {
    setNama: (state, action) => {
      state.nama = action.payload;
    },
    setCopied: (state, action) => {
      state.copied = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchArtiNama.pending, state => {
      state.loading = true;
      state.error = null;
      state.copied = false;
    }).addCase(fetchArtiNama.fulfilled, (state, action) => {
      state.loading = false;
      state.artinama = action.payload.arti;
      state.catatan = action.payload.catatan;
    }).addCase(fetchArtiNama.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  }
});
export const {
  setNama,
  setCopied
} = artinamaSlice.actions;
export default artinamaSlice.reducer;