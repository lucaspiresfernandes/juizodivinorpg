const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const urlParser = express.urlencoded({ extended: false });
const io = require('../server').io;

router.get('/:id', async (req, res) => {
    const playerID = req.params.id;

    const results = await Promise.all([
        con('player_info').select('value as name')
            .join('info', 'player_info.info_id', 'info.info_id')
            .where('player_id', playerID)
            .andWhere('name', 'Nome')
            .first(),
        con('player_avatar').select('link').where('player_id', playerID).first(),
        con('player_attribute').select('value', 'total_value').where('player_id', playerID)
            .orderBy('attribute_id')
    ]);

    let name = results[0].name.toUpperCase();
    if (!name) name = 'DESCONHECIDO';

    res.render('portrait', {
        playerID,
        name,
        avatar: results[1],
        attributes: results[2]
    });
});

router.post('/environment', urlParser, async (req, res) => {
    const environment = req.body.combat === 'true' ? 'combat' : 'idle';
    let portraitRooms = io;

    const players = await con('player').select('player_id');

    for (let i = 0; i < players.length; i++) {
        const id = players[i].player_id;
        portraitRooms = portraitRooms.to(`portrait${id}`);
    }

    portraitRooms.emit('environment change', { mode: environment });
    res.send();
});

module.exports = router;