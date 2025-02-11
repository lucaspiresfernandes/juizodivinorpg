import hbs from "hbs";
import config from "../utils/config.js";

export function registerHelpers() {
  hbs.registerHelper("rpgname", () => config.info.rpgname);
  hbs.registerHelper("playerrole", () => config.info.playerrole);
  hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  });
  hbs.registerHelper("ifNotEquals", function (arg1, arg2, options) {
    return arg1 != arg2 ? options.fn(this) : options.inverse(this);
  });
}
