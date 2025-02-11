import session from "cookie-session";
import express, { static as static_ } from "express";
import hbs from "hbs";
import hbs_utils from "hbs-utils";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerHelpers } from "./utils/registerHelpers.js";

const hbsutils = hbs_utils(hbs);
const app = express();
const server = createServer(app);
const io = new Server(server);

io.on("connect", (socket) => {
  socket.on("room:join", (roomName) => socket.join(roomName));
});

app.set("view engine", "hbs");
app.set("views", "./templates/views");
hbsutils.registerWatchedPartials("./templates/partials", { precompile: true });
app.use(static_("./public"));
app.use(
  session({
    name: "player_session",
    secret: process.env.EXPRESS_SESSION_SECRET || "unkown",
    maxAge: 86400000,
    sameSite: "strict",
  })
);

registerHelpers();

const _io = io;
export { _io as io };

import { routes } from "./routes/index.js";
for (const route of routes) app.use(route.url, route.ref);

app.get("*", (req, res) => res.status(404).send());

export function start() {
  const port = process.env.PORT || 80;
  server.listen(port, () => {
    console.log(`Listening to port ${port}...`);
  });
}
