const encrypter = require('../utils/encrypter');
const con = require('../utils/connection');
const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const config = require('../config.json');

router.get('/', (req, res) => {
	if (req.session.playerID) return res.redirect('/sheet/1');
	res.render('register');
});

router.get('/admin', (req, res) => {
	if (req.session.playerID) return res.redirect('/sheet/1');
	res.render('register', { admin: true });
});

router.post('/', jsonParser, registerPost);

router.post('/admin', jsonParser, registerPost);

async function registerPost(req, res) {
	try {
		const username = req.body.username;
		const password = req.body.password;

		if (!username || !password) return res.status(400).end();

		const usernameExists = await con('player')
			.select('username')
			.where('username', username)
			.first();

		if (usernameExists) return res.status(401).send('Username already exists.');

		let admin = false;

		const bodyAdminKey = req.body.adminKey;
		if (bodyAdminKey) {
			if (config.admin_key == bodyAdminKey) admin = true;
			else return res.status(401).send('Admin key is incorrect.');
		}

		const hash = await encrypter.encrypt(password);

		const playerID = (
			await con('player').insert({
				username: username,
				password: hash,
				admin: admin,
			})
		)[0];

		if (admin) await registerAdminData(playerID);
		else {
			const shadowPlayerID = (
				await con('player').insert({
					username: `alternativo:_${username}`,
					password: hash,
					admin: admin,
					shadow_player_id: null,
				})
			)[0];
			await con('player').where('player_id', playerID).update({
				shadow_player_id: shadowPlayerID,
			});
			await registerPlayerData(playerID, shadowPlayerID);
			req.session.shadowPlayerID = shadowPlayerID;
		}

		req.session.playerID = playerID;
		req.session.isAdmin = admin;

		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send('500: Fatal Error');
	}
}

async function registerPlayerData(playerID, shadowPlayerID) {
	const results = await Promise.all([
		con('characteristic').select('characteristic_id'),
		con('attribute').select('attribute_id'),
		con('attribute_status').select('attribute_status_id'),
		con('skill').select('skill_id', 'mandatory').where('mandatory', true),
		con('spec').select('spec_id'),
		con('info').select('info_id'),
		con('extra_info').select('extra_info_id'),
	]);

	await Promise.all([
		con('player_avatar').insert([
			{ player_id: playerID, attribute_status_id: null },
			{ player_id: playerID, attribute_status_id: 4 },
			{ player_id: playerID, attribute_status_id: 5 },
			{ player_id: playerID, attribute_status_id: 6 },
			{ player_id: shadowPlayerID, attribute_status_id: null },
			{ player_id: shadowPlayerID, attribute_status_id: 4 },
			{ player_id: shadowPlayerID, attribute_status_id: 5 },
			{ player_id: shadowPlayerID, attribute_status_id: 6 },
		]),

		con('player_characteristic').insert(
			results[0]
				.map((char) => ({
					player_id: playerID,
					characteristic_id: char.characteristic_id,
					value: 0,
				}))
				.concat(
					results[0].map((char) => ({
						player_id: shadowPlayerID,
						characteristic_id: char.characteristic_id,
						value: 0,
					}))
				)
		),

		con('player_attribute').insert(
			results[1]
				.map((attr) => ({
					player_id: playerID,
					attribute_id: attr.attribute_id,
					value: 0,
					max_value: 0,
					extra_value: 0,
				}))
				.concat(
					results[1].map((attr) => ({
						player_id: shadowPlayerID,
						attribute_id: attr.attribute_id,
						value: 0,
						max_value: 0,
						extra_value: 0,
					}))
				)
		),

		con('player_attribute_status').insert(
			results[2]
				.map((attrStatus) => ({
					player_id: playerID,
					attribute_status_id: attrStatus.attribute_status_id,
					value: false,
				}))
				.concat(
					results[2].map((attrStatus) => ({
						player_id: shadowPlayerID,
						attribute_status_id: attrStatus.attribute_status_id,
						value: false,
					}))
				)
		),

		con('player_skill').insert(
			results[3]
				.map((skill) => ({
					player_id: playerID,
					skill_id: skill.skill_id,
					value: 0,
					extra_value: 0,
				}))
				.concat(
					results[3].map((skill) => ({
						player_id: shadowPlayerID,
						skill_id: skill.skill_id,
						value: 0,
						extra_value: 0,
					}))
				)
		),

		con('player_spec').insert(
			results[4]
				.map((spec) => ({
					player_id: playerID,
					spec_id: spec.spec_id,
					value: 0,
				}))
				.concat(
					results[4].map((spec) => ({
						player_id: shadowPlayerID,
						spec_id: spec.spec_id,
						value: 0,
					}))
				)
		),

		con('player_info').insert(
			results[5]
				.map((info) => ({
					player_id: playerID,
					info_id: info.info_id,
					value: '',
				}))
				.concat(
					results[5].map((info) => ({
						player_id: shadowPlayerID,
						info_id: info.info_id,
						value: '',
					}))
				)
		),

		con('player_extra_info').insert(
			results[6]
				.map((extraInfo) => ({
					player_id: playerID,
					extra_info_id: extraInfo.extra_info_id,
					value: '',
				}))
				.concat(
					results[6].map((extraInfo) => ({
						player_id: shadowPlayerID,
						extra_info_id: extraInfo.extra_info_id,
						value: '',
					}))
				)
		),

		con('player_note').insert([
			{
				player_id: playerID,
				value: '',
			},
			{
				player_id: shadowPlayerID,
				value: '',
			},
		]),
	]);
}

function registerAdminData(playerID) {
	return con('player_note').insert({ player_id: playerID, value: '' });
}

module.exports = router;
