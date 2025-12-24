import {
  createSlice,
  createAsyncThunk
} from "@reduxjs/toolkit";
import {
  v4 as uuidv4
} from "uuid";
import Cookies from "js-cookie";
const isClient = typeof window !== "undefined";
const initialUsers = () => {
  if (isClient) {
    const item = localStorage.getItem("users");
    return item ? JSON.parse(item) : [];
  }
  return [];
};
const initialIsAuth = () => {
  if (isClient) {
    const item = localStorage.getItem("isAuth");
    return item ? JSON.parse(item) : false;
  }
  return false;
};
export const fetchUsersFromAPI = createAsyncThunk("auth/fetchUsers", async () => {
  try {
    const res = await fetch("/api/user/stats");
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = await res.json();
    return data.users || [];
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return [];
  }
});
export const authSlice = createSlice({
  name: "auth",
  initialState: {
    users: initialUsers(),
    isAuth: initialIsAuth()
  },
  reducers: {
    handleRegister: (state, action) => {
      const {
        name,
        email
      } = action.payload;
      const exists = state.users.some(user => user.email === email);
      if (exists) return;
      const newUser = {
        id: uuidv4(),
        name: name,
        email: email
      };
      state.users.push(newUser);
      if (isClient) {
        localStorage.setItem("users", JSON.stringify(state.users));
      }
    },
    handleLogin: (state, action) => {
      state.isAuth = action.payload;
      if (isClient) {
        localStorage.setItem("isAuth", JSON.stringify(state.isAuth));
      }
    },
    handleLogout: state => {
      state.isAuth = false;
      if (isClient) {
        localStorage.removeItem("isAuth");
        Cookies.remove("auth_token");
      }
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchUsersFromAPI.fulfilled, (state, action) => {
      state.users = action.payload.map(user => ({
        id: user._id || uuidv4(),
        name: user.email?.split("@")[0] || "Unknown",
        email: user.email
      }));
      if (isClient) {
        localStorage.setItem("users", JSON.stringify(state.users));
      }
    });
  }
});
export const {
  handleRegister,
  handleLogin,
  handleLogout
} = authSlice.actions;
export default authSlice.reducer;