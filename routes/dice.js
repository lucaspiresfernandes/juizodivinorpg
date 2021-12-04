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
    catch (err) { console.error('Random.org inactive. Reason: ' + err); }

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

    if (!playerID) return res.status(401).end();

    let dices = req.query.dices;

    let results = new Array(dices.length);

    const tasks = [];

    for (let i = 0; i < dices.length; i++) {
        const dice = dices[i];
        const numDices = parseInt(dice.n);
        const diceNumber = parseInt(dice.num);

        if (isNaN(diceNumber) || isNaN(numDices))
            return res.status(400).send();

        if (numDices === 0 || diceNumber < 1) {
            results[i] = diceNumber;
            continue;
        }

        if (diceNumber === 1) {
            results[i] = numDices;
            continue;
        }

        tasks.push(nextInt(numDices, numDices * diceNumber, 1).then(result =>
            results[i] = result.data.reduce((a, b) => a + b)));
    }

    await Promise.all(tasks);

    res.send({ results });

    if (!isAdmin) io.emit('dice roll', { playerID, dices, results });
});

module.exports = router;