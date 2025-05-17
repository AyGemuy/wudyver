import {
  createSlice
} from "@reduxjs/toolkit";
import {
  toast
} from "react-toastify";
const currentTime = new Date();
const formattedTime = currentTime.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit"
});
export const appChatSlice = createSlice({
  name: "appchat",
  initialState: {
    openProfile: false,
    openinfo: true,
    activechat: false,
    searchContact: "",
    mobileChatSidebar: false,
    profileinfo: {},
    messFeed: [],
    user: {},
    contacts: [{
      id: 1,
      fullName: "Gemini AI",
      role: "AI",
      lastmessage: "Hello! Just testing the app.",
      lastmessageTime: formattedTime,
      unredmessage: 1,
      avatar: "/assets/images/users/user-0.jpg",
      status: "active"
    }],
    chats: [{
      id: 1,
      userId: 1,
      messages: [{
        img: "/assets/images/users/user-0.jpg",
        content: "Hello! Just testing the app.",
        time: formattedTime,
        sender: "them"
      }]
    }]
  },
  reducers: {
    openChat: (state, action) => {
      state.activechat = action.payload.activechat;
      state.mobileChatSidebar = !state.mobileChatSidebar;
      state.user = action.payload.contact;
      const chat = state.chats.find(item => item.userId === action.payload.contact.id);
      if (chat) state.messFeed = chat.messages;
    },
    toggleMobileChatSidebar: (state, action) => {
      state.mobileChatSidebar = action.payload;
    },
    infoToggle: (state, action) => {
      state.openinfo = action.payload;
    },
    sendMessage: (state, action) => {
      state.messFeed.push(action.payload);
    },
    toggleProfile: (state, action) => {
      state.openProfile = action.payload;
    },
    setContactSearch: (state, action) => {
      state.searchContact = action.payload;
    },
    toggleActiveChat: (state, action) => {
      state.activechat = action.payload;
    }
  }
});
export const {
  openChat,
  toggleMobileChatSidebar,
  infoToggle,
  sendMessage,
  toggleProfile,
  setContactSearch,
  toggleActiveChat
} = appChatSlice.actions;
export default appChatSlice.reducer;