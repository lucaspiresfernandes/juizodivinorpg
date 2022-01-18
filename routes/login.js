const encrypter = require('../utils/encrypter');
const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const jsonParser = express.json();

router.get('/', (req, res) => {
    if (req.session.playerID) return res.redirect('/sheet/1');
    res.render('login');
});

router.post('/', jsonParser, async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || !password)
            return res.status(400).end();

        const result = await con('player').select('player.player_id', 'player.password', 'player.admin')
            .where('username', username).first();

        if (!result) return res.status(403).send('Usuário ou senha incorretos.');

        const hashword = result.password;
        const id = result.player_id;
        const admin = result.admin;
        const exists = await encrypter.compare(password, hashword);

        if (!exists) return res.status(403).send('Usuário ou senha incorretos.');

        req.session.playerID = id;
        req.session.isAdmin = admin;

        res.send({ admin });
    }
    catch (err) {
        console.error(err);
        res.status(500).send('500: Fatal Error');
    }
});

module.exports = router;