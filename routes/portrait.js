const encrypter = require('../utils/encrypter');
const express = require('express');
const router = express.Router();
const con = require('../utils/connection');

router.get('/:id', async (req, res) => {
    const playerID = req.params.id;

    const results = await Promise.all([
        (await con.select('avatar_id', '.link')
            .from('player_avatar')
            .where('player_avatar.player_id', playerID).first())?.link,

        con.select('attribute.*', 'player_attribute.value', 'player_attribute.max_value')
            .from('attribute')
            .join('player_attribute', 'attribute.attribute_id', 'player_attribute.attribute_id')
            .where('player_attribute.player_id', playerID)
    ]);

    res.render('portrait', {
        playerID,
        avatar: results[0],
        attributes: results[1]
    });
});

module.exports = router;