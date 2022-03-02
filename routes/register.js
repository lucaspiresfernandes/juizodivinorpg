const encrypter = require('../utils/encrypter');
const con = require('../utils/connection');
const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const config = require('../config.json');

router.get('/', (req, res) => {
    if (req.session.playerID) return res.redirect('/sheet/1');
    res.render('register');
});

router.get('/admin', (req, res) => {
    if (req.session.playerID) return res.redirect('/sheet/1');
    res.render('register', { admin: true });
})

router.post('/', jsonParser, registerPost);

router.post('/admin', jsonParser, registerPost);

async function registerPost(req, res) {
    try {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || !password) return res.status(400).end();

        const usernameExists = await con('player').select('username')
            .where('username', username).first();

        if (usernameExists) return res.status(401).send('Username already exists.');

        let admin = false;

        const bodyAdminKey = req.body.adminKey;
        if (bodyAdminKey) {
            if (config.admin_key == bodyAdminKey) admin = true;
            else return res.status(401).send('Admin key is incorrect.');
        }

        const hash = await encrypter.encrypt(password);

        const playerID = (await con('player').insert({
            username: username,
            password: hash,
            admin: admin
        }))[0];

        if (admin) await registerAdminData(playerID);
        else await registerPlayerData(playerID);

        req.session.playerID = playerID;
        req.session.isAdmin = admin;

        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send('500: Fatal Error');
    }
}

async function registerPlayerData(playerID) {
    const results = await Promise.all([
        con('characteristic').select('characteristic_id'),
        con('attribute').select('attribute_id'),
        con('attribute_status').select('attribute_status_id'),
        con('skill').select('skill_id', 'mandatory').where('mandatory', true),
        con('spec').select('spec_id'),
        con('info').select('info_id'),
        con('extra_info').select('extra_info_id'),
    ]);

    await Promise.all([
        con('player_avatar').insert([{ player_id: playerID, attribute_status_id: null },
        { player_id: playerID, attribute_status_id: 4 },
        { player_id: playerID, attribute_status_id: 5 },
        { player_id: playerID, attribute_status_id: 6 }]),

        con('player_characteristic').insert(results[0].map(char => {
            return {
                player_id: playerID,
                characteristic_id: char.characteristic_id,
                value: 0
            };
        })),

        con('player_attribute').insert(results[1].map(attr => {
            return {
                player_id: playerID,
                attribute_id: attr.attribute_id,
                value: 0,
                max_value: 0,
                extra_value: 0
            };
        })),

        con('player_attribute_status').insert(results[2].map(attrStatus => {
            return {
                player_id: playerID,
                attribute_status_id: attrStatus.attribute_status_id,
                value: false
            };
        })),

        con('player_skill').insert(results[3].map(skill => {
            return {
                player_id: playerID,
                skill_id: skill.skill_id,
                value: 0,
                extra_value: 0
            };
        })),

        con('player_spec').insert(results[4].map(spec => {
            return {
                player_id: playerID,
                spec_id: spec.spec_id,
                value: 0
            };
        })),

        con('player_info').insert(results[5].map(info => {
            return {
                player_id: playerID,
                info_id: info.info_id,
                value: ''
            };
        })),

        con('player_extra_info').insert(results[6].map(extraInfo => {
            return {
                player_id: playerID,
                extra_info_id: extraInfo.extra_info_id,
                value: ''
            };
        })),

        con('player_equipment').insert({
            equipment_id: 1,
            player_id: playerID,
            using: false,
            current_ammo: '-'
        }),

        con('player_note').insert({
            player_id: playerID,
            value: ''
        })
    ]);
}

function registerAdminData(playerID) {
    return con('player_note').insert({ 'player_id': playerID, 'value': '' });
}

module.exports = router;