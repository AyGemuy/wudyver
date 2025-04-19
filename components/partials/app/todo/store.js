import {
  createSlice,
  createAsyncThunk
} from "@reduxjs/toolkit";
import {
  v4 as uuidv4
} from "uuid";
import {
  toast
} from "react-toastify";
export const fetchTodosFromRoutes = createAsyncThunk("apptodo/fetchTodosFromRoutes", async () => {
  const res = await fetch("/api/routes");
  const routes = await res.json();
  return routes.map(route => ({
    id: uuidv4(),
    image: [{
      image: "/assets/images/users/user-1.jpg",
      label: "System",
      value: "system"
    }],
    title: `${route.name} - ${route.path}`,
    isDone: false,
    isfav: false,
    isTrash: false,
    category: [{
      value: route.name.toLowerCase(),
      label: route.name
    }]
  }));
});
export const appTodoSlice = createSlice({
  name: "apptodo",
  initialState: {
    todos: [],
    filter: "all",
    addModal: false,
    editModal: false,
    todoSearch: "",
    isLoading: false,
    editItem: {},
    trashTodo: [],
    mobileTodoSidebar: false
  },
  reducers: {
    openAddModal: (state, action) => {
      state.addModal = action.payload;
    },
    addTodo: (state, action) => {
      state.todos.unshift(action.payload);
      toast.success("Add Successfully", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light"
      });
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    deleteTodo: (state, action) => {
      state.todos = state.todos.filter(todo => todo.id !== action.payload);
      state.trashTodo.unshift(action.payload);
      toast.warning("Delete Successfully", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light"
      });
    },
    editTodo: (state, action) => {
      const index = state.todos.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.todos[index] = {
          ...state.todos[index],
          ...action.payload
        };
        state.editItem = state.todos[index];
        state.editModal = true;
      }
    },
    isCheck: (state, action) => {
      state.todos = state.todos.map(todo => todo.id === action.payload ? {
        ...todo,
        isDone: !todo.isDone
      } : todo);
    },
    isFaveCheck: (state, action) => {
      state.todos = state.todos.map(todo => todo.id === action.payload ? {
        ...todo,
        isfav: !todo.isfav
      } : todo);
    },
    setSearch: (state, action) => {
      state.todoSearch = action.payload;
    },
    toggleMobileTodoSidebar: (state, action) => {
      state.mobileTodoSidebar = action.payload;
    },
    closeEditModal: (state, action) => {
      state.editModal = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchTodosFromRoutes.pending, state => {
      state.isLoading = true;
    }).addCase(fetchTodosFromRoutes.fulfilled, (state, action) => {
      state.todos = action.payload;
      state.isLoading = false;
      toast.success("Todos generated from API", {
        position: "top-right",
        autoClose: 1500
      });
    }).addCase(fetchTodosFromRoutes.rejected, state => {
      state.isLoading = false;
      toast.error("Failed to fetch todos", {
        position: "top-right",
        autoClose: 1500
      });
    });
  }
});
export const {
  addTodo,
  setFilter,
  openAddModal,
  deleteTodo,
  editTodo,
  isCheck,
  isFaveCheck,
  setSearch,
  toggleMobileTodoSidebar,
  closeEditModal
} = appTodoSlice.actions;
export default appTodoSlice.reducer;