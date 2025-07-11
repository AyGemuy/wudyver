import {
  createSlice
} from "@reduxjs/toolkit";
const initialState = {
  nickname: "",
  partner: null,
  messages: [],
  isConnecting: false,
  isConnected: false
};
const anonymousChatSlice = createSlice({
  name: "anonymousChat",
  initialState: initialState,
  reducers: {
    setNickname: (state, action) => {
      state.nickname = action.payload;
    },
    startChat: state => {
      state.isConnecting = true;
      state.isConnected = false;
      state.partner = null;
      state.messages = [];
    },
    partnerFound: (state, action) => {
      state.isConnecting = false;
      state.isConnected = true;
      state.partner = action.payload;
    },
    noPartner: state => {
      state.isConnecting = false;
      state.isConnected = false;
    },
    sendMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    receiveMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    chatSkipped: state => {
      state.isConnecting = false;
      state.isConnected = false;
      state.partner = null;
      state.messages = [];
    },
    chatEnded: state => {
      state.isConnecting = false;
      state.isConnected = false;
      state.partner = null;
      state.messages = [];
    }
  }
});
export const {
  setNickname,
  startChat,
  partnerFound,
  noPartner,
  sendMessage,
  receiveMessage,
  chatSkipped,
  chatEnded
} = anonymousChatSlice.actions;
export default anonymousChatSlice.reducer;