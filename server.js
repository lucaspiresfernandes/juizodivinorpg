const express = require('express');
const http = require('http');
const path = require('path');
const registerHelpers = require('./utils/registerHelpers');
const { Server } = require('socket.io');
const hbs = require('hbs');
const hbsutils = require('hbs-utils')(hbs);
const session = require('cookie-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 80;

io.on('connect', socket => {
    socket.on('room:join', roomName => socket.join(roomName));
});

const viewsPath = path.join(__dirname, './templates/views');
const partialsPath = path.join(__dirname, './templates/partials');
const publicPath = path.join(__dirname, './public');

app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbsutils.registerPartials(partialsPath, { precompile: true });
app.use(express.static(publicPath));
app.use(session({
    name: 'player_session',
    secret: process.env.EXPRESS_SESSION_SECRET || 'unkown',
    maxAge: 86400000,
    sameSite: 'strict'
}));

registerHelpers();

module.exports.io = io;

const routes = require('./routes');
for (const route of routes) app.use(route.url, route.ref);

app.get('*', (req, res) => res.status(404).send());

module.exports.start = () => {
    server.listen(port, () => {
        console.log(`Listening to port ${port}...`);
    });
};