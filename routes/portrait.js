const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const jsonParser = express.json();
const io = require('../server').io;

router.get('/', async (req, res) => {
    const players = await con('player_info').select('player_info.value',
        'player_info.player_id')
        .where('player_info.info_id', 1);
    for (const player of players) {
        if (!player.value) player.value = 'Desconhecido';
    }
    res.render('portrait_selection', { players });
});

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
        con('config').select('value').where('key', 'portrait_environment').first()
    ]);

    res.render('portrait', {
        playerID,
        name: results[0].name.toUpperCase() || 'DESCONHECIDO',
        attributes: results[1],
        statusState: JSON.stringify(results[2]),
        player: results[3],
        onCombat: results[4].value === 'combat'
    });
});

router.post('/environment', jsonParser, async (req, res) => {
    const environment = req.body.combat ? 'combat' : 'idle';
    let portraitRooms = io;

    try {
        const players = await con('player').select('player_id');

        for (let i = 0; i < players.length; i++) {
            const id = players[i].player_id;
            portraitRooms = portraitRooms.to(`portrait${id}`);
        }
        await con('config').update('value', environment)
            .where('key', 'portrait_environment');

        portraitRooms.emit('environment change', { mode: environment });
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

module.exports = router;