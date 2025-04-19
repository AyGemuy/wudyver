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
import artinama from "@/components/partials/app/arti-nama/store";
import playwright from "@/components/partials/app/playwright/store";
const rootReducer = {
  layout: layout,
  todo: todo,
  email: email,
  chat: chat,
  project: project,
  kanban: kanban,
  calendar: calendar,
  auth: auth,
  beauty: beauty,
  openapi: openapi,
  artinama: artinama,
  playwright: playwright
};
export default rootReducer;