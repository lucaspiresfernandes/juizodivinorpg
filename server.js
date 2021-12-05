const express = require('express');
const http = require('http');
const path = require('path');
const registerHelpers = require('./utils/registerHelpers');
const { Server } = require('socket.io');
const hbs = require('hbs');
const hbsutils = require('hbs-utils')(hbs);
const expressSession = require('express-session');
const SessionStore = require('connect-session-knex')(expressSession);
const con = require('./utils/connection');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 80;

const viewsPath = path.join(__dirname, './templates/views');
const partialsPath = path.join(__dirname, './templates/partials');
const publicPath = path.join(__dirname, './public');

app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbsutils.registerPartials(partialsPath, { precompile: true });
app.use(express.static(publicPath));
app.use(expressSession({
    secret: process.env.EXPRESS_SESSION_SECRET || 'unkown',
    cookie: {
        sameSite: 'strict',
        maxAge: 86400000,
    },
    resave: true,
    saveUninitialized: false,
    store: new SessionStore({
        tablename: 'player_session',
        knex: con,
    }),
}));

registerHelpers();

module.exports.io = io;


app.get('/', (req, res) => {
    if (req.session.playerID) return res.redirect('/sheet/1');
    res.render('home');
});

const routes = require('./routes');
for (const route of routes) app.use(route.url, route.ref);

app.get('*', (req, res) => {
    res.status(404).end();
});

module.exports.start = () => {
    server.listen(port, () => {
        console.log(`Listening to port ${port}...`);
    });
};