const express = require('express');
const router = express.Router();
const RandomOrg = require('random-org');
const apiKey = process.env.RANDOM_ORG_KEY;
const random = new RandomOrg({ apiKey: apiKey });
const io = require('../server').io;

async function nextInt(min, max, n) {
    try {
        return (await random.generateIntegers({ min, max, n })).random;
    }
    catch (err) { console.error('Random.org inactive. Reason:', err); }

    let data = [];

    min = Math.ceil(min);
    max = Math.floor(max);

    for (let i = 0; i < n; i++)
        data.push(Math.floor(Math.random() * (max - min + 1) + min));

    return { data };
}

router.get('/', async (req, res) => {
    let playerID = req.session.playerID;
    let isAdmin = req.session.isAdmin;
    let dices = req.query.dices;

    if (!playerID || !dices) return res.status(401).send();

    let results = new Array(dices.length);

    try {
        await Promise.all(dices.map((dice, i) => {
            const numDices = parseInt(dice.n);
            const diceNumber = parseInt(dice.num);

            if (isNaN(numDices) || isNaN(diceNumber))
                throw new Error();

            if (numDices === 0 || diceNumber < 1) {
                results[i] = diceNumber;
                return;
            }

            if (diceNumber === 1) {
                results[i] = numDices;
                return;
            }

            return nextInt(numDices, numDices * diceNumber, 1).then(result =>
                results[i] = result.data.reduce((a, b) => a + b));
        }));

        res.send({ results });
        if (!isAdmin) io.emit('dice roll', { playerID, dices, results });
    }
    catch (err) {
        res.status(401).send();
    }
});

module.exports = router;