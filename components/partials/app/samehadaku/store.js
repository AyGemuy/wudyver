import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = `https://${process.env.DOMAIN_URL}/api/anime/samehadaku`;

// Thunks
export const fetchSearch = createAsyncThunk("samehadaku/search", async (query, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(query)}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchLatest = createAsyncThunk("samehadaku/latest", async (_, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API_BASE}?action=latest`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchRelease = createAsyncThunk("samehadaku/release", async (_, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API_BASE}?action=release`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchDetail = createAsyncThunk("samehadaku/detail", async (url, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API_BASE}?action=detail&url=${encodeURIComponent(url)}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchDownload = createAsyncThunk("samehadaku/download", async (url, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API_BASE}?action=detail&url=${encodeURIComponent(url)}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Slice
const samehadakuSlice = createSlice({
  name: "samehadaku",
  initialState: {
    searchResults: [],
    latest: [],
    release: [],
    detail: null,
    download: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Search
      .addCase(fetchSearch.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })

      // Latest
      .addCase(fetchLatest.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLatest.fulfilled, (state, action) => {
        state.loading = false;
        state.latest = action.payload;
      })

      // Release
      .addCase(fetchRelease.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRelease.fulfilled, (state, action) => {
        state.loading = false;
        state.release = action.payload;
      })

      // Detail
      .addCase(fetchDetail.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })

      // Download
      .addCase(fetchDownload.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDownload.fulfilled, (state, action) => {
        state.loading = false;
        state.download = action.payload;
      })

      // Error handler
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload || action.error.message;
        }
      );
  },
});

export default samehadakuSlice.reducer;
