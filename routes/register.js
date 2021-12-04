const encrypter = require('../utils/encrypter');
const con = require('../utils/connection');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
var urlParser = bodyParser.urlencoded(
    {
        extended: false
    });

router.get('/', (req, res) => {
    res.render('register');
});

router.get('/admin', (req, res) => {
    res.render('register',
        {
            admin: true
        });
})

router.post('/', urlParser, registerPost);

router.post('/admin', urlParser, registerPost);

async function registerPost(req, res) {
    try {
        let username = req.body.username;
        let password = req.body.password;

        if (!username || !password)
            return res.status(400).end();

        let adminKey = parseInt(req.body.adminKey);

        let results = await con.select('username').from('player').where('username', username).first();

        if (results)
            return res.status(401).send('Username already exists.');

        let admin = false;

        if (!(isNaN(adminKey))) {
            results = await con.select().from('admin_key').first();
            let originalAdminKey = parseInt(results.key);

            if (originalAdminKey === adminKey)
                admin = true;
            else
                return res.status(401).send('Admin key is incorrect.');
        }

        let hash = await encrypter.encrypt(password);

        const playerID = (await con.insert(
            {
                username: username,
                password: hash,
                admin: admin
            }).into('player'))[0];

        if (admin)
            await registerAdminData(playerID);
        else
            await registerPlayerData(playerID);

        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).send('500: Fatal Error');
    }
}

async function registerPlayerData(playerID) {
    const results = await Promise.all([
        con.select('characteristic_id').from('characteristic'),
        con.select('attribute_id').from('attribute'),
        con.select('attribute_status_id').from('attribute_status'),
        con.select('skill_id', 'start_value', 'mandatory').from('skill'),
        con.select('spec_id').from('spec'),
        con.select('info_id').from('info'),
        con.select('extra_info_id').from('extra_info'),
        con.select('finance_id').from('finance'),
    ]);

    await con.insert({
        player_id: playerID,
        attribute_status_id: null,
        link: null
    }).into('player_avatar');

    await Promise.all([
        ...results[0].map(char => con.insert({
            player_id: playerID,
            characteristic_id: char.characteristic_id,
            value: 0
        }).into('player_characteristic')),

        ...results[1].map(attr => con.insert({
            player_id: playerID,
            attribute_id: attr.attribute_id,
            value: 0
        }).into('player_attribute')),

        results[2].map(async attrStatus => {
            const playerAttrStatus = con.insert({
                player_id: playerID,
                attribute_status_id: attrStatus.attribute_status_id,
                value: false
            }).into('player_attribute_status');
            const playerAvatar = con.insert({
                player_id: playerID,
                attribute_status_id: attrStatus.attribute_status_id,
                link: null
            }).into('player_avatar');
            await playerAttrStatus;
            await playerAvatar;
        }),

        ...results[3].map(skill => {
            if (!skill.mandatory) return undefined;
            return con.insert({
                player_id: playerID,
                skill_id: skill.skill_id,
                value: skill.start_value,
                checked: false
            }).into('player_skill');
        }),

        ...results[4].map(spec => con.insert({
            player_id: playerID,
            spec_id: spec.spec_id,
            value: 0
        }).into('player_spec')),

        ...results[5].map(info => con.insert({
            player_id: playerID,
            info_id: info.info_id,
            value: ''
        }).into('player_info')),

        ...results[6].map(extraInfo => con.insert({
            player_id: playerID,
            extra_info_id: extraInfo.extra_info_id,
            value: ''
        }).into('player_extra_info')),

        ...results[7].map(finance => con.insert({
            player_id: playerID,
            finance_id: finance.finance_id,
            value: '$0'
        }).into('player_finance')),

        con.insert({
            equipment_id: 1,
            player_id: playerID,
            using: false,
            current_ammo: '-'
        }).into('player_equipment')
    ]);
}

function registerAdminData(playerID) {
    return con.insert({ 'admin_id': playerID, 'value': '' }).into('admin_note').then(() => { });
}

module.exports = router;