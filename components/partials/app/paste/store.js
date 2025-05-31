import {
  createSlice
} from "@reduxjs/toolkit";
const initialState = {
  pastes: [],
  loading: false,
  error: null
};
const pasteSlice = createSlice({
  name: "paste",
  initialState: initialState,
  reducers: {
    setPastes: (state, action) => {
      state.pastes = action.payload;
      state.loading = false;
      state.error = null;
    },
    addPaste: (state, action) => {
      state.pastes.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updatePaste: (state, action) => {
      const index = state.pastes.findIndex(paste => paste.key === action.payload.key);
      if (index !== -1) {
        state.pastes[index] = {
          ...state.pastes[index],
          ...action.payload
        };
      }
      state.loading = false;
      state.error = null;
    },
    removePaste: (state, action) => {
      state.pastes = state.pastes.filter(paste => paste.key !== action.payload);
      state.loading = false;
      state.error = null;
    },
    clearPastes: state => {
      state.pastes = [];
      state.loading = false;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
      state.error = null;
    }
  }
});
export const {
  setPastes,
  addPaste,
  updatePaste,
  removePaste,
  clearPastes,
  setError,
  setLoading
} = pasteSlice.actions;
export default pasteSlice.reducer;