const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const io = require('../server').io;
const jsonParser = express.json();

const classBonus = 4;

//#region routes

router.get('/leave', async (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error(err);
			return res.status(500).send();
		}
		res.redirect('/');
	});
});

router.get('/1', async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;

	if (!playerID) return res.redirect('/');
	if (isAdmin) return res.redirect('/sheet/admin/1');

	try {
		const results = await Promise.all([
			//Info: 0
			con('info')
				.select('info.*', 'player_info.value')
				.join('player_info', 'info.info_id', 'player_info.info_id')
				.where('player_info.player_id', playerID),

			//Avatar: 1
			con('player_avatar')
				.select(
					'attribute_status.name',
					'player_avatar.link',
					'player_avatar.attribute_status_id'
				)
				.leftJoin(
					'attribute_status',
					'player_avatar.attribute_status_id',
					'attribute_status.attribute_status_id'
				)
				.where('player_avatar.player_id', playerID),

			//Attributes and Attribute Status: 2
			con('attribute')
				.select(
					'attribute.attribute_id',
					'attribute.name',
					'attribute.rollable',
					'attribute.bg_color',
					'attribute.fill_color',
					'player_attribute.value',
					'player_attribute.max_value',
					'player_attribute.extra_value',
					'player_attribute.total_value',
					'player_attribute.coefficient',
					'attribute_status.attribute_status_id',
					'attribute_status.name as attribute_status_name',
					'player_attribute_status.value as attribute_status_value'
				)
				.join(
					'player_attribute',
					'player_attribute.attribute_id',
					'attribute.attribute_id'
				)
				.join(
					'attribute_status',
					'attribute_status.attribute_id',
					'attribute.attribute_id'
				)
				.join('player_attribute_status', (builder) =>
					builder
						.on(
							'player_attribute_status.attribute_status_id',
							'attribute_status.attribute_status_id'
						)
						.on('player_attribute_status.player_id', 'player_attribute.player_id')
				)
				.where('player_attribute.player_id', playerID)
				.then((attributesQuery) => {
					const attributes = [];
					const instantiatedIDs = new Map();
					for (const attrQuery of attributesQuery) {
						const statusObj = {
							attribute_status_id: attrQuery.attribute_status_id,
							name: attrQuery.attribute_status_name,
							checked: attrQuery.attribute_status_value,
						};

						const attr = instantiatedIDs.get(attrQuery.attribute_id);
						if (attr) {
							attr.status.push(statusObj);
							continue;
						}

						const newAttr = {
							attribute_id: attrQuery.attribute_id,
							name: attrQuery.name,
							rollable: attrQuery.rollable,
							bg_color: attrQuery.bg_color,
							fill_color: attrQuery.fill_color,
							value: attrQuery.value,
							max_value: attrQuery.max_value,
							extra_value: attrQuery.extra_value,
							total_value: attrQuery.total_value,
							coefficient: attrQuery.coefficient,
							status: [statusObj],
						};
						attributes.push(newAttr);
						instantiatedIDs.set(attrQuery.attribute_id, newAttr);
					}
					return attributes;
				}),

			//Specs: 3
			con('spec')
				.select('spec.*', 'player_spec.value')
				.join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
				.where('player_spec.player_id', playerID),

			//Characteristics: 4
			con('characteristic')
				.select('characteristic.*', 'player_characteristic.value')
				.join(
					'player_characteristic',
					'characteristic.characteristic_id',
					'player_characteristic.characteristic_id'
				)
				.where('player_characteristic.player_id', playerID),

			//Player Equipments: 5
			con('equipment')
				.select('equipment.*', 'player_equipment.current_ammo')
				.join(
					'player_equipment',
					'equipment.equipment_id',
					'player_equipment.equipment_id'
				)
				.where('player_equipment.player_id', playerID),

			//Available Equipments: 6
			con('equipment')
				.select('equipment_id', 'name')
				.where('visible', true)
				.whereNotIn(
					'equipment_id',
					con('player_equipment').select('equipment_id').where('player_id', playerID)
				)
				.orderBy('name'),

			//Skills: 7
			con('skill')
				.select(
					'skill.skill_id',
					'skill.name',
					'player_skill.value',
					'specialization.name as specialization_name',
					'player_skill.total_value',
					'player_skill.extra_value'
				)
				.join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
				.leftJoin(
					'specialization',
					'specialization.specialization_id',
					'skill.specialization_id'
				)
				.join('player_characteristic', (builder) =>
					builder
						.on('player_characteristic.characteristic_id', 'skill.characteristic_id')
						.andOn('player_characteristic.player_id', 'player_skill.player_id')
				)
				.where('player_skill.player_id', playerID)
				.then((skills) => {
					for (let i = 0; i < skills.length; i++) {
						const skill = skills[i];
						const skillName = skill.name;
						const specializationName = skill.specialization_name;
						if (specializationName)
							skills[i].name = `${specializationName} (${skillName})`;
					}
					skills.sort((a, b) => a.name.localeCompare(b.name));
					return skills;
				}),

			//Available Skills: 8
			con('skill')
				.select('skill_id', 'name')
				.whereNotIn(
					'skill_id',
					con('player_skill').select('skill_id').where('player_id', playerID)
				)
				.orderBy('name'),

			//Items: 9
			con('item')
				.select(
					'item.item_id',
					'item.name',
					'player_item.description',
					'player_item.quantity'
				)
				.join('player_item', 'item.item_id', 'player_item.item_id')
				.where('player_item.player_id', playerID),

			//Available Items: 10
			con('item')
				.select('item_id', 'name')
				.where('visible', true)
				.whereNotIn(
					'item_id',
					con('player_item').select('item_id').where('player_id', playerID)
				)
				.orderBy('name'),

			//Specializations: 11
			con('specialization').select(),

			//Notes: 12
			con('player_note').select('value').where('player_id', playerID).first(),

			//Classes List: 13
			con('class').select(),

			//Player Class: 14
			con('player')
				.select(
					'player.class_id',
					'class.ability_title',
					'class.ability_description',
					'class.attribute_id',
					'class.bonus'
				)
				.join('class', 'class.class_id', 'player.class_id')
				.where('player_id', playerID)
				.first(),

			//Player Extra Info: 15
			con('extra_info')
				.select('extra_info.*', 'player_extra_info.value')
				.join(
					'player_extra_info',
					'extra_info.extra_info_id',
					'player_extra_info.extra_info_id'
				)
				.where('player_extra_info.player_id', playerID),
		]);
		res.render('sheet1', {
			playerID,
			info: results[0],
			avatars: results[1],
			attributes: results[2],
			specs: results[3],
			characteristics: results[4],
			equipments: results[5],
			availableEquipments: results[6],
			skills: results[7],
			availableSkills: results[8],
			items: results[9],
			availableItems: results[10],
			specializations: results[11],
			playerNotes: results[12],
			classes: results[13],
			playerClass: results[14],
			extraInfo: results[15],
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.get('/2', async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;

	if (!playerID) return res.redirect('/');
	if (isAdmin) return res.redirect('/sheet/admin/2');

	try {
		const playerLineage = await con('lineage')
			.select('lineage.lineage_id', 'lineage.divine')
			.join('player', 'player.lineage_id', 'lineage.lineage_id')
			.where('player.player_id', playerID)
			.first();
		const playerLineageID = playerLineage?.lineage_id || null;

		const results = await Promise.all([
			(async () => {
				const queries = await Promise.all([
					con('lineage_node')
						.select()
						.where('lineage_id', playerLineageID)
						.orderBy('index'),
					con('player_lineage_node')
						.select()
						.where('player_id', playerID)
						.join('lineage_node', (builder) =>
							builder
								.on('lineage_node.lineage_id', 'player_lineage_node.lineage_id')
								.on('lineage_node.index', 'player_lineage_node.index')
						),
					con('lineage_node').max('level as max_level').first(),
				]);

				const lineageNodes = queries[0];
				const playerNodes = queries[1];
				const playerNodesIndex = queries[1].map((c) => c.index);
				const numLevels = queries[2].max_level;
				const rows = [];
				for (let i = 0; i < numLevels; i++) rows.push([]);

				await Promise.all(
					lineageNodes.map(async (node) => {
						const playerNode = playerNodes.find((pNode) => pNode.index === node.index);
						if (playerNode && playerNode.lineage_id !== node.lineage_id) {
							node.description = playerNode.description;
							node.type = playerNode.type;
							node.cost = playerNode.cost;
						}

						const level = parseInt(node.level);
						rows[numLevels - level].push(node);

						const connections = await con('lineage_node_connection')
							.select('index')
							.where('lineage_id', playerLineageID)
							.andWhere('next_index', node.index);

						node.conquered = playerNode !== undefined;
						node.available = true;
						for (const connection of connections) {
							if (!playerNodesIndex.includes(connection.index)) {
								node.available = node.level === 1;
								break;
							}
						}
					})
				);
				return rows;
			})(),

			con('player').select('score').where('player_id', playerID).first(),

			(async () => {
				const characteristics = await con('curse_characteristic')
					.select(
						'characteristic.characteristic_id',
						'characteristic.name',
						'player_characteristic.value as remaining_value'
					)
					.join(
						'characteristic',
						'curse_characteristic.characteristic_id',
						'characteristic.characteristic_id'
					)
					.join(
						'player_characteristic',
						'player_characteristic.characteristic_id',
						'characteristic.characteristic_id'
					)
					.where('player_characteristic.player_id', playerID);

				await Promise.all(
					characteristics.map((char) => {
						return con('player_curse')
							.select('curse.level')
							.join('curse', 'curse.curse_id', 'player_curse.curse_id')
							.where('player_curse.characteristic_id', char.characteristic_id)
							.then((curses) => {
								for (const curse of curses) {
									char.remaining_value -= curse.level;
								}
								return curses;
							});
					})
				);

				return characteristics;
			})(),

			(async () => {
				const curses = await con('player_curse')
					.select(
						'curse.curse_id',
						'curse.name',
						'curse.description',
						'curse.level',
						'player_curse.characteristic_id'
					)
					.join('curse', 'curse.curse_id', 'player_curse.curse_id')
					.where('player_curse.player_id', playerID);

				await Promise.all(
					curses.map(async (curse) => {
						const query = con('curse_focus')
							.select(
								'curse_focus.description',
								'curse_focus.characteristic_id',
								'characteristic.name'
							)
							.join(
								'characteristic',
								'characteristic.characteristic_id',
								'curse_focus.characteristic_id'
							)
							.where('curse_id', curse.curse_id);
						if (curse.characteristic_id)
							return (curse.focus = await query
								.andWhere('characteristic.characteristic_id', curse.characteristic_id)
								.first());
						curse.focuses = await query;
					})
				);
				return curses;
			})(),

			con('curse')
				.select()
				.where('visible', true)
				.whereNotIn(
					'curse_id',
					con('player_curse').select('curse_id').where('player_id', playerID)
				)
				.orderBy('name'),
		]);
		res.render('sheet2', {
			playerID,
			nodeRows: results[0],
			playerLineage,
			playerScore: results[1].score,
			characteristics: results[2],
			curses: results[3],
			availableCurses: results[4],
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.get('/admin/1', async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;

	if (!playerID) return res.redirect('/');
	if (!isAdmin) return res.redirect('/sheet/1');

	try {
		const charIDs = await con('player').select('player_id').where('admin', false);
		const characters = await Promise.all(
			charIDs.map(async (charID) => {
				const playerID = charID.player_id;
				const results = await Promise.all([
					//Info: 0
					con('info')
						.select('info.info_id', 'player_info.value', 'info.name')
						.join('player_info', 'info.info_id', 'player_info.info_id')
						.where('player_id', playerID)
						.andWhere('info.name', 'Nome')
						.first()
						.then((info) => {
							if (!info.value) info.value = 'Desconhecido';
							return info;
						}),

					//Attributes: 1
					con('attribute')
						.select(
							'attribute.attribute_id',
							'attribute.name',
							'attribute.fill_color',
							'player_attribute.value',
							'player_attribute.max_value',
							'player_attribute.extra_value',
							'player_attribute.total_value'
						)
						.join(
							'player_attribute',
							'attribute.attribute_id',
							'player_attribute.attribute_id'
						)
						.where('player_attribute.player_id', playerID),

					//Specs: 2
					con('spec')
						.select('spec.*', 'player_spec.value')
						.join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
						.where('player_spec.player_id', playerID),

					//Combat: 3
					con('equipment')
						.select(
							'equipment.equipment_id',
							'equipment.name',
							'equipment.kind',
							'equipment.type',
							'equipment.range',
							'equipment.characteristic',
						)
						.join(
							'player_equipment',
							'equipment.equipment_id',
							'player_equipment.equipment_id'
						)
						.where('player_equipment.player_id', playerID),

					//Items: 4
					con('item')
						.select(
							'item.item_id',
							'item.name',
							'player_item.description',
							'player_item.quantity'
						)
						.join('player_item', 'item.item_id', 'player_item.item_id')
						.where('player_item.player_id', playerID),

					//Lineages: 5
					con('lineage').select(),

					//Player Lineage, Score and class name: 6
					con('player')
						.select('player.lineage_id', 'player.score', 'class.name as class_name')
						.leftJoin('class', 'class.class_id', 'player.class_id')
						.where('player.player_id', playerID)
						.first(),

					//Player Lineage Node: 7
					con('player_lineage_node')
						.select('lineage_node.index', 'lineage_node.level')
						.join('lineage_node', (builder) =>
							builder
								.on('lineage_node.lineage_id', 'player_lineage_node.lineage_id')
								.on('lineage_node.index', 'player_lineage_node.index')
						)
						.where('player_id', playerID)
						.orderBy('lineage_node.level', 'DESC')
						.orderBy('date_conquered', 'DESC')
						.first(),

					//Player Latest Status: 8
					con('player_attribute_status')
						.select('attribute_status_id', 'value')
						.where('player_id', playerID),
				]);

				return {
					playerID,
					info: results[0],
					attributes: results[1],
					specs: results[2],
					// characteristics: results[3],
					equipments: results[3],
					items: results[4],
					lineage: results[5],
					player: { ...results[6], ...results[7] },
					attributeStatus: JSON.stringify(results[8]),
				};
			})
		);

		const results = await Promise.all([
			//Admin Notes: 0
			con('player_note').select('value').where('player_id', playerID).first(),
			//Portrait Environment: 1
			con('config').select('value').where('key', 'portrait_environment').first(),
		]);

		res.render('sheetadmin1', {
			characters,
			adminNotes: results[0],
			environmentState: results[1].value,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).send();
	}
});

router.get('/admin/2', async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;

	if (!playerID) return res.redirect('/');
	if (!isAdmin) return res.redirect('/sheet/2');

	const queries = [
		//All Equipments: 0
		con('equipment').select('equipment.*'),

		//All Skills: 1
		con('skill')
			.select('skill.*', 'specialization.name as specialization_name')
			.leftJoin(
				'specialization',
				'skill.specialization_id',
				'specialization.specialization_id'
			)
			.orderBy('skill.name'),

		//All Items: 2
		con('item').select(),

		//Specializations: 3
		con('specialization').select(),

		//Characteristics: 4
		con('characteristic').select(),

		//Combat Specializations: 5
		con('skill').select('skill.name', 'skill.skill_id'),

		//Focus Characteristics: 6
		con('curse_characteristic')
			.select('characteristic.characteristic_id', 'characteristic.name')
			.join(
				'characteristic',
				'characteristic.characteristic_id',
				'curse_characteristic.characteristic_id'
			),

		//Curses
		con('curse').select(),
	];

	try {
		const results = await Promise.all(queries);
		res.render('sheetadmin2', {
			equipmentsList: results[0],
			skillsList: results[1],
			itemsList: results[2],
			specializations: results[3],
			characteristics: results[4],
			combatSpecializations: results[5],
			focusCharacteristics: results[6],
			cursesList: results[7],
		});
	} catch (err) {
		console.error(err);
		return res.status(500).send();
	}
});

//#endregion

//#region CRUDs

router.post('/player/info', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const infoID = req.body.infoID;

	if (!playerID || !infoID) return res.status(401).send();

	const value = req.body.value;
	try {
		await con('player_info')
			.update({ value })
			.where('player_id', playerID)
			.andWhere('info_id', infoID);
		res.send();
		io.to('admin').emit('info changed', { playerID, infoID, value });
		io.to(`portrait${playerID}`).emit('info changed', { infoID, value });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/attribute', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const attributeID = req.body.attributeID;

	if (!playerID || !attributeID) return res.status(401).send();

	const value = req.body.value;
	const max_value = req.body.maxValue;
	const extra_value = req.body.extraValue;

	try {
		await con('player_attribute')
			.update({ value, max_value, extra_value })
			.where('player_id', playerID)
			.andWhere('attribute_id', attributeID);

		res.send();

		const result = await con('player_attribute')
			.select('value', 'total_value')
			.where('player_id', playerID)
			.andWhere('attribute_id', attributeID)
			.first();

		const data = {
			attributeID,
			totalValue: result.total_value,
			value: result.value,
		};

		io.to('admin').emit('attribute changed', { playerID, ...data });
		io.to(`portrait${playerID}`).emit('attribute changed', data);
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/attributestatus', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const attrStatusID = req.body.attributeStatusID;
	const value = req.body.checked;

	if (!playerID || !attrStatusID) return res.status(401).send();

	try {
		await con('player_attribute_status')
			.update({ value })
			.where('player_id', playerID)
			.andWhere('attribute_status_id', attrStatusID);

		res.send();

		io.to(`portrait${playerID}`).emit('attribute status changed', {
			attrStatusID,
			value,
		});
		io.to('admin').emit('attribute status changed', { playerID, attrStatusID, value });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/spec', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const specID = req.body.specID;

	if (!playerID || !specID) return res.status(401).send();

	const value = req.body.value;
	try {
		await con('player_spec')
			.update({ value })
			.where('player_id', playerID)
			.andWhere('spec_id', specID);

		res.send();

		io.to('admin').emit('spec changed', { playerID, specID, value });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/characteristic', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const charID = req.body.characteristicID;

	if (!playerID || !charID) return res.status(401).send();

	const value = req.body.value;
	try {
		await con('player_characteristic')
			.update({ value })
			.where('player_id', playerID)
			.andWhere('characteristic_id', charID);

		const affectedCurses = await con('player_curse')
			.select('curse.curse_id', 'curse.level')
			.join('curse', 'curse.curse_id', 'player_curse.curse_id')
			.where('player_id', playerID)
			.andWhere('characteristic_id', charID)
			.orderBy('date_acquired', 'DESC');

		let auxVal = value;
		for (const curse of affectedCurses) {
			auxVal -= curse.level;
		}

		if (auxVal < 0) {
			await Promise.all(
				affectedCurses.map((curse) => {
					if (auxVal < 0) {
						auxVal += curse.level;
						return con('player_curse')
							.update({ characteristic_id: null })
							.where('player_id', playerID)
							.andWhere('curse_id', curse.curse_id);
					}
				})
			);
		}

		const skills = await con('skill')
			.select('skill.skill_id', 'player_skill.value', 'skill.characteristic_id')
			.join('player_skill', 'player_skill.skill_id', 'skill.skill_id')
			.where('skill.characteristic_id', charID)
			.andWhere('player_skill.player_id', playerID);

		const updatedSkills = await updateSkills(playerID, skills);

		const updatedAttributes = await updateAttributes(playerID, (clause) =>
			clause
				.where((builder) =>
					builder.where('attribute.characteristic_id', charID).orWhereIn(
						'attribute.skill_id',
						updatedSkills.map((skill) => skill.skillID)
					)
				)
				.andWhere('player_attribute.player_id', playerID)
		);

		res.send({ updatedSkills, updatedAttributes });
		io.to('admin').emit('characteristic changed', { playerID, charID, value });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/player/equipment', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const equipmentID = req.body.equipmentID;

	if (!playerID || !equipmentID) return res.status(401).send();

	try {
		const equipment = await con('equipment')
			.select('equipment.*')
			.where('equipment.equipment_id', equipmentID)
			.first();

		const current_ammo = isNaN(equipment.ammo) ? '-' : 0;
		await con('player_equipment').insert({
			player_id: playerID,
			equipment_id: equipmentID,
			current_ammo,
		});
		equipment.current_ammo = current_ammo;

		res.send({ equipment });
		io.to('admin').emit('equipment added', {
			playerID,
			equipmentID,
			name: equipment.name,
			damage: equipment.damage,
			range: equipment.range,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/equipment', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const equipmentID = req.body.equipmentID;

	if (!playerID || !equipmentID) return res.status(401).send();

	try {
		await con('player_equipment')
			.update({ current_ammo: req.body.currentAmmo })
			.where('player_id', playerID)
			.andWhere('equipment_id', equipmentID);
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/player/equipment', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const equipmentID = req.body.equipmentID;

	if (!playerID || !equipmentID) return res.status(401).send();

	try {
		await con('player_equipment')
			.where('player_id', playerID)
			.andWhere('equipment_id', equipmentID)
			.del();
		res.send();
		io.to('admin').emit('equipment deleted', { playerID, equipmentID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/equipment', jsonParser, async (req, res) => {
	const name = req.body.name;
	const damage = req.body.damage;
	const kind = req.body.kind;
	const type = req.body.type;
	const range = req.body.range;
	const ammo = req.body.ammo;
	const characteristic = req.body.characteristic;
	const visible = req.body.visible;

	if (
		name === undefined ||
		type === undefined ||
		kind === undefined ||
		damage === undefined ||
		range === undefined ||
		characteristic === undefined ||
		ammo === undefined ||
		visible === undefined
	)
		return res.status(401).send();

	try {
		const equipmentID = (
			await con('equipment').insert({
				name,
				damage,
				kind,
				type,
				range,
				ammo,
				characteristic,
				visible,
			})
		)[0];

		res.send({ equipmentID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/equipment', jsonParser, async (req, res) => {
	const equipmentID = req.body.equipmentID;
	const name = req.body.name;
	const damage = req.body.damage;
	const kind = req.body.kind;
	const type = req.body.type;
	const range = req.body.range;
	const ammo = req.body.ammo;
	const characteristic = req.body.characteristic;
	const visible = req.body.visible;

	if (!req.session.isAdmin || !equipmentID) return res.status(401).send();

	try {
		await con('equipment')
			.update({
				name,
				damage,
				type,
				kind,
				range,
				ammo,
				characteristic,
				visible,
			})
			.where('equipment_id', equipmentID);
		res.send();
		if (visible !== undefined) {
			const equipmentName = name
				? name
				: (
						await con('equipment')
							.select('name')
							.where('equipment_id', equipmentID)
							.first()
				  ).name;
			await emitToAllPlayers(visible ? 'equipment added' : 'equipment removed', {
				equipmentID,
				name: equipmentName,
			});
		}
		emitToAllPlayers('equipment changed', {
			equipmentID,
			name,
			type,
			kind,
			damage,
			range,
			ammo,
			characteristic,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/equipment', jsonParser, async (req, res) => {
	const id = req.body.equipmentID;

	if (!req.session.isAdmin || !id) return res.status(401).send();

	try {
		await con('equipment').where('equipment_id', id).del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/player/skill', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const skillID = req.body.skillID;

	if (!playerID || !skillID) return res.status(401).send();

	try {
		await con('player_skill').insert({
			player_id: playerID,
			skill_id: skillID,
			value: 0,
			extra_value: 0,
		});

		const skill = await con('skill')
			.select(
				'skill.skill_id',
				'skill.name',
				'player_skill.value',
				'specialization.name as specialization_name',
				'skill.characteristic_id'
			)
			.join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
			.leftJoin(
				'specialization',
				'skill.specialization_id',
				'specialization.specialization_id'
			)
			.join('player_characteristic', (builder) =>
				builder
					.on('player_characteristic.characteristic_id', 'skill.characteristic_id')
					.andOn('player_characteristic.player_id', 'player_skill.player_id')
			)
			.where('player_skill.player_id', playerID)
			.andWhere('player_skill.skill_id', skillID)
			.first();

		if (skill.specialization_name) {
			let skillName = skill.name;
			skill.name = `${skill.specialization_name} (${skillName})`;
		}

		res.send({ skill });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/skill', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const skillID = req.body.skillID;

	if (!playerID || !skillID) return res.status(401).send();

	try {
		await con('player_skill')
			.update('value', req.body.value)
			.where('player_id', playerID)
			.andWhere('skill_id', skillID);

		const updatedAttributes = await updateAttributes(playerID, (clause) =>
			clause
				.where('attribute.skill_id', skillID)
				.andWhere('player_attribute.player_id', playerID)
		);
		res.send({ updatedAttributes });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/skill', jsonParser, async (req, res) => {
	const characteristic_id = req.body.characteristicID;
	const name = req.body.name;

	if (characteristic_id === undefined || name === undefined)
		return res.status(401).send();

	try {
		const skillID = (
			await con('skill').insert({
				specialization_id: req.body.specializationID || null,
				characteristic_id,
				name,
			})
		)[0];
		res.send({ skillID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/skill', jsonParser, async (req, res) => {
	const skillID = req.body.skillID;
	const characteristic_id = req.body.characteristicID;
	const name = req.body.name;
	const mandatory = req.body.mandatory;

	if (!req.session.isAdmin || !skillID) return res.status(401).send();

	try {
		await con('skill')
			.update({
				specialization_id: parseInt(req.body.specialization_id) || null,
				characteristic_id,
				name,
				mandatory,
			})
			.where('skill_id', skillID);
		res.send();

		const skillNames = await con('skill')
			.select('skill.name as skill_name', 'specialization.name as spec_name')
			.leftJoin(
				'specialization',
				'skill.specialization_id',
				'specialization.specialization_id'
			)
			.where('skill.skill_id', skillID)
			.first();

		let skillName = skillNames.skill_name;
		if (skillNames.spec_name) skillName = `${skillNames.spec_name} (${skillName})`;
		emitToAllPlayers('skill changed', { skillID, name: skillName });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/skill', jsonParser, async (req, res) => {
	const skillID = req.body.skillID;

	if (!req.session.isAdmin || !skillID) return res.status(401).send();

	try {
		await con('skill').where('skill_id', skillID).del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/player/item', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const itemID = req.body.itemID;

	if (!playerID || !itemID) return res.status(401).send();

	try {
		await con('player_item').insert({
			player_id: playerID,
			item_id: itemID,
			description: con('item').select('description').where('item_id', itemID),
		});

		const item = await con('item')
			.select(
				'item.item_id',
				'item.name',
				'player_item.description',
				'player_item.quantity'
			)
			.join('player_item', 'item.item_id', 'player_item.item_id')
			.where('player_item.player_id', playerID)
			.andWhere('item.item_id', itemID)
			.first();

		res.send({ item });

		io.to('admin').emit('item created', {
			playerID,
			itemID,
			name: item.name,
			description: item.description,
			quantity: item.quantity,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/item', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const itemID = req.body.itemID;

	if (!playerID || !itemID) return res.status(401).send();

	const description = req.body.description;
	const quantity = req.body.quantity;

	try {
		await con('player_item')
			.update({ description, quantity })
			.where('player_id', playerID)
			.andWhere('item_id', itemID);

		io.to('admin').emit('item changed', { playerID, itemID, description, quantity });

		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/player/item', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const itemID = req.body.itemID;

	if (!playerID || !itemID) return res.status(401).send();

	try {
		await con('player_item')
			.where('player_id', playerID)
			.andWhere('item_id', itemID)
			.del();

		io.to('admin').emit('item deleted', { playerID, itemID });

		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/item', jsonParser, async (req, res) => {
	const name = req.body.name;
	const description = req.body.description;
	const visible = req.body.visible;

	if (name === undefined || description === undefined || visible === undefined)
		return res.status(401).send();
	try {
		const itemID = (
			await con('item').insert({
				name,
				description,
				visible,
			})
		)[0];

		res.send({ itemID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/item', jsonParser, async (req, res) => {
	const itemID = req.body.itemID;
	if (!req.session.isAdmin || !itemID) return res.status(401).send();

	const name = req.body.name;
	const visible = req.body.visible;
	try {
		await con('item')
			.update({
				name,
				description: req.body.description,
				visible,
			})
			.where('item_id', itemID);
		res.send();
		if (visible !== undefined) {
			const itemName = name
				? name
				: (await con('item').select('name').where('item_id', itemID).first()).name;
			await emitToAllPlayers(visible ? 'item added' : 'item removed', {
				itemID,
				name: itemName,
			});
		}
		emitToAllPlayers('item changed', { itemID, name });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/item', jsonParser, async (req, res) => {
	const itemID = req.body.itemID;

	if (!req.session.isAdmin || !itemID) return res.status(401).send();

	try {
		await con('item').where('item_id', itemID).del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/extrainfo', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const extraInfoID = req.body.extraInfoID;

	if (!playerID || !extraInfoID) return res.status(401).send();

	try {
		await con('player_extra_info')
			.update('value', req.body.value)
			.where('player_id', playerID)
			.andWhere('extra_info_id', extraInfoID);

		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.get('/curse/focus', async (req, res) => {
	const curseID = req.query.curseID;

	if (!curseID) return res.status(401).send();

	try {
		const focuses = await con('curse_focus')
			.select('characteristic_id', 'description')
			.where('curse_id', curseID);
		res.send({ focuses });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;
	const name = req.body.name;
	const description = req.body.description;
	const level = req.body.level;
	const focuses = req.body.focuses;

	if (!playerID || !isAdmin) return res.status(401).send();

	try {
		const curseID = (
			await con('curse').insert({
				name,
				description,
				level,
				visible: false,
			})
		)[0];

		await Promise.all(
			focuses.map((focus) =>
				con('curse_focus').insert({
					curse_id: curseID,
					characteristic_id: focus.characteristicID,
					description: focus.description,
				})
			)
		);

		res.send({ curseID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;
	const curseID = req.body.curseID;
	const name = req.body.name;
	const description = req.body.description;
	const level = req.body.level;
	const visible = req.body.visible;
	const focuses = req.body.focuses;

	if (!playerID || !isAdmin || !curseID) return res.status(401).send();

	try {
		if (name || description || level || visible !== undefined) {
			await con('curse')
				.update({
					name,
					description,
					level,
					visible,
				})
				.where('curse_id', curseID);
		}

		if (focuses) {
			await Promise.all(
				focuses.map((focus) =>
					con('curse_focus')
						.update({
							description: focus.description,
						})
						.where('curse_id', curseID)
						.andWhere('characteristic_id', focus.characteristicID)
				)
			);
		}

		if (visible !== undefined) {
			const curse = await con('curse')
				.select('name', 'description')
				.where('curse_id', curseID)
				.first();
			await emitToAllPlayers(visible ? 'curse added' : 'curse removed', {
				curseID,
				name: curse.name,
				description: curse.description,
			});
		}
		emitToAllPlayers('curse changed', { curseID, name, description, level });

		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const isAdmin = req.session.isAdmin;
	const curseID = req.body.curseID;

	if (!playerID || !isAdmin) return res.status(401).send();

	try {
		await con('curse').where('curse_id', curseID).del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.put('/player/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const curseID = req.body.curseID;

	if (!playerID || !curseID) return res.status(401).send();

	try {
		await con('player_curse').insert({
			player_id: playerID,
			curse_id: curseID,
			characteristic_id: null,
		});

		const curse = await con('curse')
			.select('curse_id', 'name', 'description', 'level')
			.where('curse_id', curseID)
			.first();

		curse.focuses = await con('curse_focus')
			.select(
				'curse_focus.characteristic_id',
				'curse_focus.description',
				'characteristic.name'
			)
			.join(
				'characteristic',
				'characteristic.characteristic_id',
				'curse_focus.characteristic_id'
			)
			.where('curse_id', curseID);

		res.send({ curse });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const characteristicID = req.body.characteristicID;
	const curseID = req.body.curseID;

	if (!playerID || !characteristicID || !curseID) return res.status(401).send();

	try {
		await con('player_curse')
			.update({
				characteristic_id: characteristicID,
			})
			.where('player_id', playerID)
			.andWhere('curse_id', curseID);
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.delete('/player/curse', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const curseID = req.body.curseID;

	if (!playerID || !curseID) return res.status(401).send();
	try {
		await con('player_curse')
			.where('player_id', playerID)
			.andWhere('curse_id', curseID)
			.del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/note', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;

	if (!playerID) return res.status(401).send();

	try {
		await con('player_note').update('value', req.body.value).where('player_id', playerID);
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/class', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const newClassID = req.body.classID || null;

	if (!playerID) return res.status(401).send();

	try {
		const oldClass = await con('player')
			.select('class.class_id', 'class.attribute_id')
			.leftJoin('class', 'class.class_id', 'player.class_id')
			.where('player_id', playerID)
			.first();
		const oldClassID = oldClass.class_id || null;
		await con('player').update('class_id', newClassID).where('player_id', playerID);
		const newClass = await con('class')
			.select('attribute_id', 'name')
			.where('class_id', newClassID)
			.first();

		const skills = await con('class_skill')
			.select('skill.skill_id', 'player_skill.value', 'skill.characteristic_id')
			.join('skill', 'skill.skill_id', 'class_skill.skill_id')
			.join('player_skill', 'player_skill.skill_id', 'skill.skill_id')
			.whereIn('class_skill.class_id', [oldClassID, newClassID])
			.andWhere('player_skill.player_id', playerID);

		const updatedSkills = await updateSkills(playerID, skills);
		const updatedAttributes = await updateAttributes(playerID, (clause) =>
			clause
				.where((builder) =>
					builder
						.whereIn(
							'attribute.skill_id',
							updatedSkills.map((skill) => skill.skillID)
						)
						.orWhereIn('attribute.attribute_id', [
							oldClass.attribute_id || null,
							newClass?.attribute_id || null,
						])
				)
				.andWhere('player_attribute.player_id', playerID)
		);

		res.send({ updatedSkills, updatedAttributes });
		io.to('admin').emit('class change', {
			playerID,
			className: newClass?.name || 'Nenhuma',
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/score', jsonParser, async (req, res) => {
	const playerID = req.body.playerID;

	if (!playerID) return res.status(401).send();

	const score = req.body.value;
	try {
		await con('player').update('score', score).where('player_id', playerID);
		res.send();
		io.to(`player${playerID}`).emit('score change', { score });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/lineage', jsonParser, async (req, res) => {
	const playerID = req.body.playerID;

	if (!playerID || req.body.lineageID === undefined) return res.status(401).send();

	const lineageID = req.body.lineageID || null;
	try {
		await Promise.all([
			con('player').update('lineage_id', lineageID).where('player_id', playerID),
			con('player_lineage_node').where('player_id', playerID).del(),
		]);
		if (lineageID)
			await con('player_lineage_node').insert({
				lineage_id: lineageID,
				player_id: playerID,
				index: 1,
			});
		res.send();
		io.to(`player${playerID}`)
			.to(`portrait${playerID}`)
			.emit('lineage change', { lineageID });
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.post('/player/lineage/node', jsonParser, async (req, res) => {
	const playerID = req.session.playerID;
	const index = req.body.index;
	let nodeLineageID = req.body.lineageID;

	if (!playerID || !index) return res.status(401).send();

	try {
		const player = await con('player')
			.select('lineage_id', 'score')
			.where('player_id', playerID)
			.first();
		const playerLineageID = player.lineage_id;
		if (!nodeLineageID) nodeLineageID = playerLineageID;
		const oldScore = player.score;
		await con('player_lineage_node').insert({
			lineage_id: nodeLineageID,
			player_id: playerID,
			index,
		});

		const lineageNode = await con('lineage_node')
			.select('cost', 'level')
			.where('lineage_id', nodeLineageID)
			.andWhere('index', index)
			.first();
		const newScore = oldScore - lineageNode.cost;

		const newNodes = [];
		await Promise.all([
			con('player').where('player_id', playerID).update('score', newScore),
			(async () => {
				const conqueredNodes = (
					await con('player_lineage_node').select('index').where('player_id', playerID)
				).map((node) => node.index);
				const newlyConqueredSubsequentsNode = await con('lineage_node_connection')
					.select()
					.where('lineage_node_connection.lineage_id', playerLineageID)
					.andWhere('lineage_node_connection.index', index)
					.join('lineage_node', (builder) =>
						builder
							.on('lineage_node.lineage_id', 'lineage_node_connection.lineage_id')
							.andOn('lineage_node.index', 'lineage_node_connection.next_index')
					);

				for (const node of newlyConqueredSubsequentsNode) {
					const connectedNodes = await con('lineage_node_connection')
						.select('index')
						.where('lineage_id', playerLineageID)
						.andWhere('next_index', node.index);
					let available = true;
					for (const connection of connectedNodes) {
						if (!conqueredNodes.includes(connection.index)) {
							available = false;
							break;
						}
					}
					if (available) newNodes.push(node);
				}
			})(),
		]);
		res.send({ newNodes, newScore });
		io.to('admin').emit('lineage node change', {
			playerID,
			index,
			level: lineageNode.level,
			newScore,
		});
		io.to(`portrait${playerID}`).emit('lineage node change', {
			index,
			level: lineageNode.level,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});

router.get('/lineage/node', async (req, res) => {
	const index = parseInt(req.query.index);
	if (isNaN(index)) return res.status(401).send();
	const nodes = await con('lineage_node')
		.select(
			'lineage_node.name',
			'lineage_node.cost',
			'lineage_node.description',
			'lineage_node.type',
			'lineage_node.lineage_id'
		)
		.join('lineage', 'lineage.lineage_id', 'lineage_node.lineage_id')
		.where('lineage_node.index', index)
		.andWhere('lineage.divine', false);
	res.send({ nodes });
});

router.delete('/player', jsonParser, async (req, res) => {
	const playerID = req.body.playerID;
	const isAdmin = req.session.isAdmin;

	if (!playerID || !isAdmin) return res.status(401).send();

	try {
		await con('player').where('player_id', playerID).del();
		res.send();
	} catch (err) {
		console.error(err);
		res.status(500).send();
	}
});
//#endregion

//#region Utils

async function updateAttributes(playerID, whereClause) {
	const attributes = await con('attribute')
		.select(
			'attribute.attribute_id',
			'attribute.characteristic_id',
			'attribute.skill_id',
			'attribute.operation',
			'player_attribute.value',
			'player_attribute.total_value',
			'player_attribute.max_value'
		)
		.join('player_attribute', 'player_attribute.attribute_id', 'attribute.attribute_id')
		.where(whereClause);

	if (attributes.length === 0) return attributes;

	const charIDs = attributes.map((attr) => attr.characteristic_id);

	const queries = await Promise.all([
		con('characteristic')
			.select('characteristic.characteristic_id', 'player_characteristic.value')
			.join(
				'player_characteristic',
				'characteristic.characteristic_id',
				'player_characteristic.characteristic_id'
			)
			.whereIn('characteristic.characteristic_id', charIDs)
			.andWhere('player_characteristic.player_id', playerID),
		con('class')
			.select('class.attribute_id', 'class.bonus')
			.join('player', 'player.class_id', 'class.class_id')
			.where('player.player_id', playerID)
			.first(),
		con('skill')
			.select('skill.skill_id', 'player_skill.total_value')
			.join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
			.where('player_id', playerID),
	]);

	const characteristics = queries[0];
	const playerClass = queries[1];
	const skills = queries[2];

	return await Promise.all(
		attributes.map((attr) => {
			const attributeID = attr.attribute_id;

			const charValue =
				characteristics.find((char) => char.characteristic_id === attr.characteristic_id)
					?.value || 0;
			const skillValue =
				skills.find((skill) => skill.skill_id === attr.skill_id)?.total_value || 0;

			const evaluation = Math.ceil(
				eval(
					attr.operation
						.replace('{characteristic}', charValue)
						.replace('{skill}', skillValue)
				)
			);
			const bonus = playerClass?.attribute_id === attributeID ? playerClass.bonus : 0;

			const extraValue = evaluation + bonus;
			const totalValue = attr.max_value + extraValue;
			const value = clamp(attr.value, 0, totalValue);

			return con('player_attribute')
				.update({ extra_value: extraValue, value })
				.where('player_id', playerID)
				.andWhere('attribute_id', attributeID)
				.then(() => {
					io.to('admin').emit('attribute changed', {
						playerID,
						attributeID,
						value,
						totalValue,
					});
					io.to(`portrait${playerID}`).emit('attribute changed', {
						attributeID,
						value,
						totalValue,
					});
					return { attributeID, extraValue };
				});
		})
	);
}

async function updateSkills(playerID, skills) {
	if (skills.length === 0) return skills;

	const charList = [];
	const charMap = new Map();
	await Promise.all(
		skills.map((skill) => {
			if (!charMap.has(skill.characteristic_id)) {
				charMap.set(skill.characteristic_id, 'set');
				return con('characteristic')
					.select('characteristic.*', 'player_characteristic.value')
					.join('skill', 'skill.characteristic_id', 'characteristic.characteristic_id')
					.join(
						'player_characteristic',
						'player_characteristic.characteristic_id',
						'characteristic.characteristic_id'
					)
					.where('skill.skill_id', skill.skill_id)
					.andWhere('player_characteristic.player_id', playerID)
					.first()
					.then((res) => charList.push(res));
			}
		})
	);

	const classSkillIDs = (
		await con('class_skill')
			.select('class_skill.skill_id')
			.join('player', 'player.class_id', 'class_skill.class_id')
			.where('player.player_id', playerID)
	).map((cs) => cs.skill_id);

	return await Promise.all(
		skills.map((skill) => {
			const skillID = skill.skill_id;
			const charValue = charList.find(
				(char) => char.characteristic_id === skill.characteristic_id
			).value;
			const extraValue = charValue + (classSkillIDs.includes(skillID) ? classBonus : 0);
			const totalValue = extraValue + skill.value;

			return con('player_skill')
				.update('extra_value', extraValue)
				.where('player_id', playerID)
				.andWhere('skill_id', skillID)
				.then(() => {
					return { skillID, totalValue, extraValue };
				});
		})
	);
}

async function emitToAllPlayers(ev, payload) {
	const players = await con('player').select('player_id');
	if (players.length === 0) return;
	let portraitRooms = io;
	for (let i = 0; i < players.length; i++) {
		const id = players[i].player_id;
		portraitRooms = portraitRooms.to(`player${id}`);
	}
	portraitRooms.emit(ev, payload);
}

function clamp(cur, min, max) {
	if (cur < min) return min;
	if (cur > max) return max;
	return cur;
}

//#endregion

module.exports = router;
