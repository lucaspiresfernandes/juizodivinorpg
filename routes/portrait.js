const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const urlParser = express.urlencoded({ extended: false });
const io = require('../server').io;

router.get('/:id', async (req, res) => {
    const playerID = req.params.id;

    if (!playerID) return res.status(401).send();

    const results = await Promise.all([
        con('player_info').select('value as name')
            .where('player_id', playerID)
            .andWhere('info_id', 1)
            .first(),
        con('player_attribute').select('value', 'total_value').where('player_id', playerID)
            .orderBy('attribute_id'),
        con('player_attribute_status').select('attribute_status_id', 'value')
            .where('player_id', playerID)
            .orderBy('attribute_status_id'),
        con('player').select('player.lineage_id').max('player_lineage_node.index as index')
            .join('player_lineage_node', 'player_lineage_node.player_id', 'player.player_id')
            .where('player.player_id', playerID).first(),
    ]);

    if (!results[0]) return res.status(404).send();

    let name = results[0].name.toUpperCase();
    if (!name) name = 'DESCONHECIDO';

    const attribute_status = results[2];
    for (const attribute of attribute_status) {
        attribute.value = attribute.value === 0 ? false : true;
    }

    res.render('portrait', {
        playerID,
        name,
        attributes: results[1],
        attribute_status,
        player: results[3]
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