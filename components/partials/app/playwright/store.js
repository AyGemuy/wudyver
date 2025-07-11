import {
  createSlice,
  createAsyncThunk
} from "@reduxjs/toolkit";
import {
  toast
} from "react-toastify";
export const runPlaywrightCode = createAsyncThunk("playwright/run", async ({
  sourceCode,
  timeout
}, {
  rejectWithValue
}) => {
  try {
    const res = await fetch("/api/tools/playwright", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: sourceCode,
        timeout: timeout
      })
    });
    const data = await res.json();
    if (!data.output) {
      toast.warning("Tidak ada output yang diterima.");
      return rejectWithValue("Tidak ada output yang diterima.");
    }
    toast.success("Kode berhasil dijalankan!");
    return data.output;
  } catch (err) {
    toast.error("Terjadi kesalahan saat memproses.");
    return rejectWithValue("Terjadi kesalahan saat memproses.");
  }
});
const playwrightSlice = createSlice({
  name: "playwright",
  initialState: {
    sourceCode: "",
    timeoutMs: 5e3,
    loading: false,
    output: "",
    error: null,
    showModal: false,
    copied: false
  },
  reducers: {
    setSourceCode: (state, action) => {
      state.sourceCode = action.payload;
    },
    setTimeoutMs: (state, action) => {
      state.timeoutMs = action.payload;
    },
    closeModal: state => {
      state.showModal = false;
    },
    setCopied: (state, action) => {
      state.copied = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(runPlaywrightCode.pending, state => {
      state.loading = true;
      state.error = null;
      state.output = "";
    }).addCase(runPlaywrightCode.fulfilled, (state, action) => {
      state.loading = false;
      state.output = action.payload;
      state.showModal = true;
    }).addCase(runPlaywrightCode.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  }
});
export const {
  setSourceCode,
  setTimeoutMs,
  closeModal,
  setCopied
} = playwrightSlice.actions;
export default playwrightSlice.reducer;