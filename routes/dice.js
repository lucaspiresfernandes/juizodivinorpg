const express = require('express');
const router = express.Router();
const RandomOrg = require('random-org');
const apiKey = process.env.RANDOM_ORG_KEY || 'unkown';
const random = new RandomOrg({ apiKey: apiKey });
const io = require('../server').io;

async function nextInt(min, max, n) {
    try { return (await random.generateIntegers({ min, max, n })).random; }
    catch (err) { console.error('Random.org inactive. Reason:', err); }

    let data = [];

    min = Math.ceil(min);
    max = Math.floor(max);

    for (let i = 0; i < n; i++)
        data.push(Math.floor(Math.random() * (max - min + 1) + min));

    return { data };
}

router.get('/', async (req, res) => {
    const playerID = req.session.playerID;
    const isAdmin = req.session.isAdmin;
    const dices = req.query.dices;
    const resolverKey = req.query.resolverKey;

    if (!playerID || !dices) return res.status(401).send();

    if (dices.length === 1 && dices[0].n == 1)
        io.to(`portrait${playerID}`).emit('dice roll');

    const results = new Array(dices.length);

    try {
        await Promise.all(dices.map((dice, i) => {
            const numDices = parseInt(dice.n);
            const diceNumber = parseInt(dice.roll);

            if (isNaN(numDices) || isNaN(diceNumber))
                throw new Error();

            if (numDices === 0 || diceNumber < 1) {
                results[i] = { roll: diceNumber };
                return;
            }

            if (diceNumber === 1) {
                results[i] = { roll: numDices };
                return;
            }

            return nextInt(numDices, numDices * diceNumber, 1).then(result => {
                const roll = result.data.reduce((a, b) => a + b, 0);
                results[i] = { roll };
                const num = dices[i].num;
                if (num) {
                    const resolver = resolveSuccessType[resolverKey];
                    if (resolver) results[i].successType = resolver(num, roll);
                }
            });
        }));

        res.send({ results });
        if (!isAdmin) io.to('admin').emit('dice result', { playerID, dices, results });
        if (dices.length === 1 && dices[0].n == 1)
            io.to(`portrait${playerID}`).emit('dice result', { results });
    }
    catch (err) {
        console.error(err);
        res.status(401).send();
    }
});

const goodRate = 0.5, extremeRate = 0.2;

const resolveSuccessType = {
    '20': function (number, roll) {
        const f2 = Math.floor(number / 2);
        const f5 = Math.floor(number / 5);
        const f10 = Math.floor(number / 10);
        const f10_10 = Math.floor((number - 10) / 10);
        const f10_20 = Math.floor((number - 20) / 10);

        if (roll > 20 - f10_20) return { description: 'Extremo', isCritical: true };
        else if (roll > 20 - f10_10) return { description: 'Bom', isCritical: true };
        else if (roll > 20 - f10) return { description: 'Normal', isCritical: true };
        else if (roll > 20 - f5) return { description: 'Extremo' };
        else if (roll > 20 - f2) return { description: 'Bom' };
        else if (roll > 20 - number) return { description: 'Normal' };
        else if (roll == 1) return { description: 'Desastre' };
        else return { description: 'Fracasso' };
    },

    '100nobranch': function (number, roll) {
        if (roll <= number) return { description: 'Sucesso' };
        else return { description: 'Fracasso' };
    }
}

module.exports = router;