import {
  v4 as uuidv4
} from "uuid";
const themeConfig = {
  app: {
    name: "Dashcode React"
  },
  layout: {
    isRTL: false,
    darkMode: true,
    semiDarkMode: true,
    skin: "bordered",
    contentWidth: "full",
    type: "vertical",
    navBarType: "sticky",
    footerType: "sticky",
    isMonochrome: false,
    menu: {
      isCollapsed: false,
      isHidden: false
    },
    mobileMenu: false,
    customizer: false
  }
};
export default themeConfig;