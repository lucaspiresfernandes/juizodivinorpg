const express = require('express');
const router = express.Router();
const RandomOrg = require('random-org');
const random = new RandomOrg({ apiKey: process.env.RANDOM_ORG_KEY || 'unkown' });
const io = require('../server').io;
const jsonParser = express.json();

async function nextInt(min, max, n) {
	try {
		return (await random.generateIntegers({ min, max, n })).random;
	} catch (err) {
		console.error('Random.org inactive. Reason:', err);
	}

	let data = [];

	min = Math.ceil(min);
	max = Math.floor(max);

	for (let i = 0; i < n; i++)
		data.push(Math.floor(Math.random() * (max - min + 1) + min));

	return { data };
}

router.post('/', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;
	const dices = req.body.dices;
	const resolverKey = req.body.resolverKey;

	if (!playerID || !dices) return res.status(401).send();

	if (dices.length === 1 && dices[0].n == 1)
		io.to(`portrait${playerID}`).emit('dice roll');

	const results = new Array(dices.length);

	try {
		await Promise.all(
			dices.map((dice, index) => {
				const numDices = parseInt(dice.n);
				const diceNumber = parseInt(dice.roll);

				if (isNaN(numDices) || isNaN(diceNumber)) throw new Error();

				if (numDices === 0 || diceNumber < 1) {
					results[index] = { roll: diceNumber };
					return;
				}

				if (diceNumber === 1) {
					results[index] = { roll: numDices };
					return;
				}

				return nextInt(numDices, numDices * diceNumber, 1).then((result) => {
					const roll = result.data.reduce((a, b) => a + b, 0);
					results[index] = { roll };
					const num = dices[index].num;
					if (num !== undefined) {
						const resolver = resolveSuccessType[resolverKey];
						if (resolver) results[index].successType = resolver(num, roll);
					}
				});
			})
		);

		res.send({ results });
		if (!isAdmin) io.to('admin').emit('dice result', { playerID, dices, results });
		if (dices.length === 1 && dices[0].n == 1) {
			io.to(`portrait${playerID}`).emit('dice result', { results });
		}
	} catch (err) {
		console.error(err);
		res.status(401).send();
	}
});

const resolveSuccessType = {
	20: function (number, roll) {
		const f2 = Math.floor(number * 0.5);
		const f5 = Math.floor(number * 0.2);
		const f10 = Math.floor(number * 0.1);
		const f10_10 = Math.floor((number - 10) * 0.1);
		const f10_20 = Math.floor((number - 20) * 0.1);

		if (roll > 20 - f10_20)
			return { description: 'Extremo', isCritical: true, modifier: -12 };
		if (roll > 20 - f10_10)
			return { description: 'Bom', isCritical: true, modifier: -10 };
		if (roll > 20 - f10) return { description: 'Normal', isCritical: true, modifier: -8 };
		if (roll > 20 - f5) return { description: 'Extremo', modifier: -6 };
		if (roll > 20 - f2) return { description: 'Bom', modifier: -4 };
		if (roll > 20 - number) return { description: 'Normal', modifier: -2 };
		if (roll == 1) return { description: 'Desastre', modifier: +2 };
		return { description: 'Fracasso', modifier: 0 };
	},

	'100nobranch': function (number, roll) {
		if (roll <= number) return { description: 'Sucesso' };
		return { description: 'Fracasso' };
	},
};

module.exports = router;
