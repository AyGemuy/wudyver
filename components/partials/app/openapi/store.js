import {
  createSlice,
  createAsyncThunk
} from "@reduxjs/toolkit";
import {
  toast
} from "react-toastify";
export const fetchOpenApiSpec = createAsyncThunk("openapi/fetchSpec", async (_, {
  rejectWithValue
}) => {
  try {
    const res = await fetch("/api/openapi");
    if (!res.ok) throw new Error("Gagal fetch OpenAPI spec");
    const data = await res.json();
    toast.success("Berhasil memuat OpenAPI spec!");
    return data;
  } catch (error) {
    toast.error(error.message || "Gagal fetch OpenAPI spec");
    return rejectWithValue(error.message);
  }
});
const openapiSlice = createSlice({
  name: "openapi",
  initialState: {
    spec: null,
    status: "idle",
    error: null
  },
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchOpenApiSpec.pending, state => {
      state.status = "loading";
    }).addCase(fetchOpenApiSpec.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.spec = action.payload;
    }).addCase(fetchOpenApiSpec.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    });
  }
});
export default openapiSlice.reducer;