const express = require('express');
const router = express.Router();
const jsonParser = require('body-parser').json();
const con = require('../utils/connection');
const axios = require('axios');

router.get('/:attrStatusID', async (req, res) => {
    const playerID = req.session.playerID;
    let attrStatusID = req.params.attrStatusID;

    if (attrStatusID < 1 || isNaN(attrStatusID))
        attrStatusID = null;

    if (!playerID)
        return res.status(401).send();

    try {
        const link = (await con.select('link')
            .from('player_avatar')
            .where('attribute_status_id', attrStatusID)
            .andWhere('player_id', playerID).first()).link;

        if (!link) return res.send();

        const response = await axios.get(link, { responseType: 'arraybuffer', timeout: 10000 });
        res.contentType(response.headers['content-type']);
        res.end(response.data, 'binary');
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const data = req.body;

    if (!playerID)
        return res.status(401).send();

    const avatars = await con.select('attribute_status_id')
        .from('player_avatar').where('player_id', playerID);

    let queries = [];
    for (const avatar of avatars) {
        const id = avatar.attribute_status_id;

        const obj = data.find(av => av.attribute_status_id == id);

        if (!obj)
            return res.status(400).send();

        let link = obj.link;
        if (link === '') link = null;

        queries.push(con('player_avatar')
            .update({ 'link': link })
            .where('attribute_status_id', id)
            .andWhere('player_id', playerID));
    }

    try {
        await Promise.all(queries);
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

module.exports = router;