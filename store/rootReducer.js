import layout from "./layoutReducer";
import todo from "@/components/partials/app/todo/store";
import email from "@/components/partials/app/email/store";
import chat from "@/components/partials/app/chat/store";
import project from "@/components/partials/app/projects/store";
import kanban from "@/components/partials/app/kanban/store";
import calendar from "@/components/partials/app/calender/store";
import auth from "@/components/partials/auth/store";
import beauty from "@/components/partials/app/beauty-js/store";
import openapi from "@/components/partials/app/openapi/store";
import artiNama from "@/components/partials/app/arti-nama/store";
import playwright from "@/components/partials/app/playwright/store";
import apiPlayground from "@/components/partials/app/playground/store";
import samehadaku from "@/components/partials/app/samehadaku/store";

const rootReducer = {
  layout,
  todo,
  email,
  chat,
  project,
  kanban,
  calendar,
  auth,
  beauty,
  openapi,
  artiNama,
  playwright,
  apiPlayground,
  samehadaku
};
export default rootReducer;
