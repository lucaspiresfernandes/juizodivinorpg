import home from "./home.js";
import register from "./register.js";
import sheet from "./sheet.js";
import dice from "./dice.js";
import avatar from "./avatar.js";
import portrait from "./portrait.js";

export const routes = [
  { url: "/", ref: home },
  { url: "/register", ref: register },
  { url: "/sheet", ref: sheet },
  { url: "/dice", ref: dice },
  { url: "/avatar", ref: avatar },
  { url: "/portrait", ref: portrait },
];
