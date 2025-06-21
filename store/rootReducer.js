import layout from "./layoutReducer";
import paste from "@/components/partials/app/paste/store";
import chat from "@/components/partials/app/chat/store";
import auth from "@/components/partials/auth/store";
import beauty from "@/components/partials/app/beauty-js/store";
import artinama from "@/components/partials/app/arti-nama/store";
import playwright from "@/components/partials/app/playwright/store";
import anon from "@/components/partials/app/anon/store";
const rootReducer = {
  layout: layout,
  paste: paste,
  chat: chat,
  auth: auth,
  beauty: beauty,
  artinama: artinama,
  playwright: playwright,
  anon: anon
};
export default rootReducer;