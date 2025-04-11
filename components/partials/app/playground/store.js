import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

export const fetchRoutes = createAsyncThunk(
  'apiPlayground/fetchRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/openapi');
      if (!res.ok) throw new Error('Gagal memuat routes');
      const json = await res.json();
      toast.success('Berhasil memuat daftar routes!');
      return Object.entries(json.paths).flatMap(([path, methods]) =>
        Object.keys(methods).map(method => ({ path, method }))
      );
    } catch (err) {
      toast.error(err.message || 'Gagal fetch routes');
      return rejectWithValue(err.message);
    }
  }
);

export const invokeApi = createAsyncThunk(
  'apiPlayground/invokeApi',
  async (_, { getState, rejectWithValue }) => {
    const { endpoint, method, body } = getState().apiPlayground;
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method.toUpperCase() !== 'GET' ? body : undefined,
      });
      const data = await res.text();
      toast.success(`Berhasil memanggil endpoint ${method.toUpperCase()} ${endpoint}`);
      return data;
    } catch (err) {
      toast.error(err.message || 'Gagal memanggil API');
      return rejectWithValue(err.message);
    }
  }
);


const apiPlaygroundSlice = createSlice({
  name: 'apiPlayground',
  initialState: {
    endpoint: '/api/openapi',
    method: 'POST',
    body: '{}',
    response: '',
    routes: [],
    sortBy: 'asc',
    page: 1,
    pageSize: 10,
  },
  reducers: {
    setEndpoint: (state, action) => { state.endpoint = action.payload; },
    setMethod: (state, action) => { state.method = action.payload; },
    setBody: (state, action) => { state.body = action.payload; },
    setResponse: (state, action) => { state.response = action.payload; },
    setSortBy: (state, action) => { state.sortBy = action.payload; },
    setPage: (state, action) => { state.page = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(invokeApi.fulfilled, (state, action) => {
        state.response = action.payload;
      })
      .addCase(invokeApi.rejected, (state, action) => {
        state.response = `Error: ${action.payload}`;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.routes = action.payload;
      });
  }
});

export const {
  setEndpoint, setMethod, setBody, setResponse,
  setSortBy, setPage
} = apiPlaygroundSlice.actions;

export default apiPlaygroundSlice.reducer;
