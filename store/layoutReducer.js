import {
  createSlice
} from "@reduxjs/toolkit";
import themeConfig from "@/configs/themeConfig";
const initialState = {
  isRTL: themeConfig.layout.isRTL,
  darkMode: themeConfig.layout.darkMode,
  isCollapsed: themeConfig.layout.isCollapsed,
  customizer: themeConfig.layout.customizer,
  semiDarkMode: themeConfig.layout.semiDarkMode,
  skin: themeConfig.layout.skin,
  contentWidth: themeConfig.layout.contentWidth,
  type: themeConfig.layout.type,
  menuHidden: themeConfig.layout.menu.isHidden,
  navBarType: themeConfig.layout.navBarType,
  footerType: themeConfig.layout.footerType,
  mobileMenu: themeConfig.layout.mobileMenu,
  isMonochrome: themeConfig.layout.isMonochrome
};
export const layoutSlice = createSlice({
  name: "layout",
  initialState: initialState,
  reducers: {
    handleDarkMode: (state, action) => {
      state.darkMode = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("darkMode", action.payload);
      }
    },
    handleSidebarCollapsed: (state, action) => {
      state.isCollapsed = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("sidebarCollapsed", action.payload);
      }
    },
    handleCustomizer: (state, action) => {
      state.customizer = action.payload;
    },
    handleSemiDarkMode: (state, action) => {
      state.semiDarkMode = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("semiDarkMode", action.payload);
      }
    },
    handleRtl: (state, action) => {
      state.isRTL = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("direction", JSON.stringify(action.payload));
      }
    },
    handleSkin: (state, action) => {
      state.skin = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("skin", JSON.stringify(action.payload));
      }
    },
    handleContentWidth: (state, action) => {
      state.contentWidth = action.payload;
    },
    handleType: (state, action) => {
      state.type = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("type", JSON.stringify(action.payload));
      }
    },
    handleMenuHidden: (state, action) => {
      state.menuHidden = action.payload;
    },
    handleNavBarType: (state, action) => {
      state.navBarType = action.payload;
    },
    handleFooterType: (state, action) => {
      state.footerType = action.payload;
    },
    handleMobileMenu: (state, action) => {
      state.mobileMenu = action.payload;
    },
    handleMonoChrome: (state, action) => {
      state.isMonochrome = action.payload;
      if (typeof window !== "undefined") {
        window?.localStorage.setItem("monochrome", action.payload);
      }
    }
  }
});
export const {
  handleDarkMode,
  handleSidebarCollapsed,
  handleCustomizer,
  handleSemiDarkMode,
  handleRtl,
  handleSkin,
  handleContentWidth,
  handleType,
  handleMenuHidden,
  handleNavBarType,
  handleFooterType,
  handleMobileMenu,
  handleMonoChrome
} = layoutSlice.actions;
export default layoutSlice.reducer;