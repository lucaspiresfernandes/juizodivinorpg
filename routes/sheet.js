const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const io = require('../server').io;
const jsonParser = express.json();

const classBonus = 4;

//#region routes

router.get('/leave', async (req, res) => {
    req.session.destroy(err => {
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
            con('info').select('info.*', 'player_info.value')
                .join('player_info', 'info.info_id', 'player_info.info_id')
                .where('player_info.player_id', playerID),

            //Avatar: 1
            con('player_avatar').select('attribute_status.name', 'player_avatar.link', 'player_avatar.attribute_status_id')
                .leftJoin('attribute_status', 'player_avatar.attribute_status_id', 'attribute_status.attribute_status_id')
                .where('player_avatar.player_id', playerID),

            //Attributes and Attribute Status: 2
            (async () => {
                const results = await Promise.all([
                    //Attributes
                    con('attribute').select('attribute.*', 'player_attribute.value', 'player_attribute.max_value',
                        'player_attribute.coefficient', 'player_attribute.extra_value', 'player_attribute.total_value')
                        .join('player_attribute', 'attribute.attribute_id', 'player_attribute.attribute_id')
                        .where('player_attribute.player_id', playerID),

                    //Status
                    con('attribute_status').select('attribute_status.*', 'player_attribute_status.value')
                        .join('player_attribute_status', 'attribute_status.attribute_status_id', 'player_attribute_status.attribute_status_id')
                        .where('player_attribute_status.player_id', playerID)
                ]);

                const attributes = results[0];
                const status = results[1];

                for (let i = 0; i < attributes.length; i++) {
                    const attr = attributes[i];
                    attr.status = [];

                    for (let j = 0; j < status.length; j++) {
                        const stat = status[j];
                        stat.checked = stat.value ? true : false;
                        if (stat.attribute_id === attr.attribute_id)
                            attr.status.push(stat);
                    }
                }

                return attributes;
            })(),

            //Specs: 3
            con('spec').select('spec.*', 'player_spec.value')
                .join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
                .where('player_spec.player_id', playerID),

            //Characteristics: 4
            con('characteristic').select('characteristic.*', 'player_characteristic.value')
                .join('player_characteristic', 'characteristic.characteristic_id', 'player_characteristic.characteristic_id')
                .where('player_characteristic.player_id', playerID),

            //Player Equipments: 5
            con('equipment').select('equipment.*', 'skill.name as skill_name', 'player_equipment.using', 'player_equipment.current_ammo')
                .join('skill', 'equipment.skill_id', 'skill.skill_id')
                .join('player_equipment', 'equipment.equipment_id', 'player_equipment.equipment_id')
                .where('player_equipment.player_id', playerID),

            //Available Equipments: 6
            con('equipment').select('equipment_id', 'name')
                .where('visible', true)
                .whereNotIn('equipment_id', con('player_equipment').select('equipment_id').where('player_id', playerID))
                .orderBy('name'),

            //Skills: 7
            (async () => {
                const skills = await con('skill').select('skill.skill_id', 'skill.name',
                    'player_skill.value', 'specialization.name as specialization_name',
                    'player_skill.total_value', 'player_skill.extra_value')
                    .join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
                    .leftJoin('specialization', 'specialization.specialization_id', 'skill.specialization_id')
                    .join('player_characteristic', function () {
                        this.on('player_characteristic.characteristic_id', 'skill.characteristic_id')
                            .andOn('player_characteristic.player_id', 'player_skill.player_id')
                    })
                    .where('player_skill.player_id', playerID);

                for (let i = 0; i < skills.length; i++) {
                    const skill = skills[i];
                    let skillName = skill.name;
                    let specializationName = skill.specialization_name;
                    if (specializationName)
                        skills[i].name = `${specializationName} (${skillName})`;
                }
                skills.sort((a, b) => a.name.localeCompare(b.name));
                return skills;
            })(),

            //Available Skills: 8
            con('skill').select('skill_id', 'name')
                .whereNotIn('skill_id', con('player_skill').select('skill_id').where('player_id', playerID))
                .orderBy('name'),

            //Items: 9
            con('item').select('item.item_id', 'item.name', 'player_item.description', 'player_item.quantity')
                .join('player_item', 'item.item_id', 'player_item.item_id')
                .where('player_item.player_id', playerID),

            //Available Items: 10
            con('item').select('item_id', 'name')
                .where('visible', true)
                .whereNotIn('item_id', con('player_item').select('item_id').where('player_id', playerID))
                .orderBy('name'),

            //Specializations: 12
            con('specialization').select(),

            //Combat Specializations: 13
            con('skill').select('skill.name', 'skill.skill_id'),

            //Notes: 14
            con('player_note').select('value').where('player_id', playerID).first(),

            //Classes List: 15
            (async () => {
                const classes = await con('class').select();
                await Promise.all(classes.map(async _class => {
                    const skills = await con('class_skill').select('skill_id')
                        .where('class_id', _class.class_id);
                    _class.skills = JSON.stringify(skills.map(skill => skill.skill_id));
                }));
                return classes;
            })(),

            //Player Class: 16
            (async () => {
                const _class = await con('player').select('player.class_id', 'class.ability_title',
                    'class.ability_description', 'class.attribute_id', 'class.bonus')
                    .join('class', 'class.class_id', 'player.class_id')
                    .where('player_id', playerID)
                    .first();

                if (_class) {
                    const skills = await con('class_skill').select('skill_id')
                        .where('class_id', _class.class_id);
                    _class.skills = JSON.stringify(skills.map(skill => skill.skill_id));
                }
                return _class;
            })(),

            //Player Info: 17
            con('extra_info').select('extra_info.*', 'player_extra_info.value')
                .join('player_extra_info', 'extra_info.extra_info_id', 'player_extra_info.extra_info_id')
                .where('player_extra_info.player_id', playerID)
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
            combatSpecializations: results[12],
            playerNotes: results[13],
            classes: results[14],
            playerClass: results[15],
            extraInfo: results[16],
        });
    }
    catch (err) {
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
        const playerLineageID = (await con('player').select('lineage_id').where('player_id', playerID).first())?.lineage_id || null;
        const results = await Promise.all([
            (async () => {
                const nodes = await con('lineage_node').select()
                    .where('lineage_id', playerLineageID)
                    .orderBy('index');

                const conqueredNodes = (await con('player_lineage_node').select('index').where('player_id', playerID))
                    .map(c => c.index);

                const rows = [[], [], [], [], [], []];

                await Promise.all(nodes.map(async node => {
                    const level = parseInt(node.level);
                    rows[5 - level].push(node);

                    //All of the nodes connected to the current node.
                    const connections = await con('lineage_node_connection').select('index')
                        .where('lineage_id', playerLineageID)
                        .andWhere('next_index', node.index);

                    node.conquered = conqueredNodes.includes(node.index);
                    //A node is available if all of its previous connected nodes are conquered.
                    let available = true;
                    for (const connection of connections) {
                        if (!conqueredNodes.includes(connection.index)) {
                            available = false;
                            break;
                        }
                    }
                    if (!available) available = node.level === 0 || connections.length === 0;
                    node.available = available;
                }));
                return rows;
            })(),

            con('player').select('score').where('player_id', playerID).first()
        ]);

        res.render('sheet2', {
            playerID,
            nodeRows: results[0],
            playerLineage: playerLineageID,
            playerScore: results[1].score
        });
    }
    catch (err) {
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
        const characters = await Promise.all(charIDs.map(async charID => {
            const playerID = charID.player_id;
            const results = await Promise.all([
                //Info: 0
                (async () => {
                    const info = await con('info').select('info.info_id', 'player_info.value', 'info.name')
                        .join('player_info', 'info.info_id', 'player_info.info_id')
                        .where('player_id', playerID)
                        .andWhere('info.name', 'Nome')
                        .first();

                    if (!info.value || info.value.length === 0)
                        info.value = 'Desconhecido';
                    return info;
                })(),

                //Attributes: 1
                con('attribute').select('attribute.attribute_id', 'attribute.name', 'attribute.fill_color',
                    'player_attribute.value', 'player_attribute.max_value', 'player_attribute.extra_value',
                    'player_attribute.total_value')
                    .join('player_attribute', 'attribute.attribute_id', 'player_attribute.attribute_id')
                    .where('player_attribute.player_id', playerID),

                //Specs: 2
                con('spec').select('spec.*', 'player_spec.value')
                    .join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
                    .where('player_spec.player_id', playerID),

                //Characteristics: 3
                con('characteristic').select('characteristic.characteristic_id', 'characteristic.name', 'player_characteristic.value')
                    .join('player_characteristic', 'characteristic.characteristic_id', 'player_characteristic.characteristic_id')
                    .where('player_characteristic.player_id', playerID)
                    .andWhere('characteristic.name', 'Deslocamento'),

                //Combat: 4
                con('equipment').select('equipment.equipment_id', 'player_equipment.using', 'equipment.name', 'equipment.damage', 'equipment.range', 'equipment.attacks')
                    .join('player_equipment', 'equipment.equipment_id', 'player_equipment.equipment_id')
                    .where('player_equipment.player_id', playerID),

                //Items: 5
                con('item').select('item.item_id', 'item.name', 'player_item.description', 'player_item.quantity')
                    .join('player_item', 'item.item_id', 'player_item.item_id')
                    .where('player_item.player_id', playerID),

                //Lineages: 6
                con('lineage').select(),

                //Player Lineage, Score and class name: 7
                con('player').select('player.lineage_id', 'player.score', 'class.name as class_name')
                    .leftJoin('class', 'class.class_id', 'player.class_id')
                    .where('player.player_id', playerID).first(),

                //Player Latest Status
                con('player_attribute_status').select('attribute_status_id', 'value')
                    .where('player_id', playerID)
            ]);

            return {
                playerID: playerID,
                info: results[0],
                attributes: results[1],
                specs: results[2],
                characteristics: results[3],
                equipments: results[4],
                items: results[5],
                lineage: results[6],
                player: results[7],
                attributeStatus: JSON.stringify(results[8])
            };
        }));

        const results = await Promise.all([
            //Admin Notes: 0
            con('player_note').select('value')
                .where('player_id', playerID)
                .first(),
            //Portrait Environment: 1
            con('config').select('value').where('key', 'portrait_environment').first()
        ]);

        res.render('sheetadmin1', {
            characters,
            adminNotes: results[0],
            environmentState: results[1].value
        });
    }
    catch (err) {
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
        con('equipment').select('equipment.*', 'skill.name as skill_name')
            .join('skill', 'equipment.skill_id', 'skill.skill_id'),

        //All Skills: 1
        con('skill').select('skill.*', 'specialization.name as specialization_name')
            .leftJoin('specialization', 'skill.specialization_id', 'specialization.specialization_id')
            .orderBy('skill.name'),

        //All Items: 2
        con('item').select(),

        //Specializations: 3
        con('specialization').select(),

        //Characteristics: 4
        con('characteristic').select(),

        //Combat Specializations: 5
        con('skill').select('skill.name', 'skill.skill_id')
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
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).send();
    }
})

//#endregion

//#region CRUDs

router.post('/player/info', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const infoID = req.body.infoID;

    if (!playerID || !infoID) return res.status(401).send();

    const value = req.body.value;
    try {
        await con('player_info').update('value', value).where('player_id', playerID).andWhere('info_id', infoID);
        res.send();
        io.to('admin').emit('info changed', { playerID, infoID, value });
        io.to(`portrait${playerID}`).emit('info changed', { infoID, value });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/attribute', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const attributeID = req.body.attributeID;

    if (!playerID || !attributeID) return res.status(401).send();

    const value = req.body.value;
    const maxValue = req.body.maxValue;
    const extraValue = req.body.extraValue;

    try {
        await con('player_attribute').update({
            'value': value,
            'max_value': maxValue,
            'extra_value': extraValue
        }).where('player_id', playerID).andWhere('attribute_id', attributeID);

        res.send();

        const result = await con('player_attribute').select('value', 'total_value')
            .where('player_id', playerID).andWhere('attribute_id', attributeID).first();

        const data = {
            attributeID,
            totalValue: result.total_value,
            value: result.value,
        };

        io.to('admin').emit('attribute changed', { playerID, ...data });
        io.to(`portrait${playerID}`).emit('attribute changed', data);
    }
    catch (err) {
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
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('attribute_status_id', attrStatusID);

        io.to(`portrait${playerID}`).emit('attribute status changed', { attrStatusID, value });
        io.to('admin').emit('attribute status changed', { playerID, attrStatusID, value });
        res.send();
    }
    catch (err) {
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
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('spec_id', specID);

        io.to('admin').emit('spec changed', { playerID, specID, value });
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/characteristic', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const charID = req.body.characteristicID;

    if (!playerID || !charID) return res.status(401).send();

    const charValue = req.body.value;
    try {
        const oldCharID = (await con('player_characteristic').select('characteristic_id')
            .where('player_id', playerID).andWhere('characteristic_id', charID).first()).characteristic_id;
        await con('player_characteristic')
            .update('value', charValue)
            .where('player_id', playerID)
            .andWhere('characteristic_id', charID);
        const classID = (await con('player').select('class_id').where('player_id', playerID).first()).class_id;

        const skills = await con('skill').select('skill.skill_id', 'player_skill.value',
            'skill.characteristic_id', 'player_skill.total_value')
            .join('player_skill', 'player_skill.skill_id', 'skill.skill_id')
            .whereIn('skill.characteristic_id', [charID, oldCharID])
            .andWhere('player_skill.player_id', playerID);

        const updatedSkills = await updateSkills(playerID, classID, skills);
        const updatedSkillsIDs = updatedSkills.map(skill => skill.skillID);

        const attributes = await con('attribute').select('attribute.attribute_id',
            'attribute.characteristic_id', 'attribute.skill_id', 'attribute.operation',
            'player_attribute.value', 'player_attribute.total_value', 'player_attribute.max_value')
            .join('player_attribute', 'player_attribute.attribute_id', 'attribute.attribute_id')
            .where(function () {
                this.whereIn('attribute.characteristic_id', [oldCharID, charID])
                this.orWhereIn('attribute.skill_id', updatedSkillsIDs);
            })
            .andWhere('player_attribute.player_id', playerID);

        const updatedAttributes = await updateAttributes(playerID, classID, attributes);

        res.send({ updatedSkills, updatedAttributes });
        io.to('admin').emit('characteristic changed', { playerID, charID, value: charValue });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.put('/player/equipment', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const equipmentID = req.body.equipmentID;

    if (!playerID || !equipmentID) return res.status(401).send();

    try {
        const equipment = await con('equipment').select('equipment.*', 'skill.name as skill_name')
            .join('skill', 'equipment.skill_id', 'skill.skill_id')
            .where('equipment.equipment_id', equipmentID)
            .first();

        const current_ammo = isNaN(equipment.ammo) ? '-' : 0;
        await con('player_equipment').insert({
            player_id: playerID,
            equipment_id: equipmentID,
            current_ammo,
            using: false
        });
        equipment.current_ammo = current_ammo;
        equipment.using = false;

        res.send({ equipment });
        io.to('admin').emit('equipment added', {
            playerID, equipmentID, using: false, name: equipment.name,
            damage: equipment.damage, range: equipment.range, attacks: equipment.attacks
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/equipment', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const equipmentID = req.body.equipmentID;

    if (!playerID || !equipmentID) return res.status(401).send();

    try {
        const using = req.body.using;
        await con('player_equipment')
            .update({ using, current_ammo: req.body.currentAmmo })
            .where('player_id', playerID)
            .andWhere('equipment_id', equipmentID);
        io.to('admin').emit('equipment changed', { playerID, equipmentID, using });
        res.send();
    }
    catch (err) {
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
        io.to('admin').emit('equipment deleted', { playerID, equipmentID });
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.put('/equipment', jsonParser, async (req, res) => {
    const name = req.body.name;
    const type = req.body.type;
    const skill_id = req.body.skillID;
    const damage = req.body.damage;
    const range = req.body.range;
    const attacks = req.body.attacks;
    const ammo = req.body.ammo;
    const visible = req.body.visible;

    if (name === undefined || type === undefined || skill_id === undefined ||
        damage === undefined || range === undefined || attacks === undefined ||
        ammo === undefined || visible === undefined) return res.status(401).send();

    try {
        const equipmentID = (await con('equipment').insert({
            name,
            type,
            skill_id,
            damage,
            range,
            attacks,
            ammo,
            visible
        }))[0];

        res.send({ equipmentID });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/equipment', jsonParser, async (req, res) => {
    const equipmentID = req.body.equipmentID;
    const name = req.body.name;
    const type = req.body.type;
    const skill_id = req.body.skillID;
    const damage = req.body.damage;
    const range = req.body.range;
    const attacks = req.body.attacks;
    const ammo = req.body.ammo;
    const visible = req.body.visible;

    if (!req.session.isAdmin || !equipmentID || skill_id === 0) return res.status(401).send();

    try {
        await con('equipment').update({
            name,
            type,
            skill_id,
            damage,
            range,
            attacks,
            ammo,
            visible,
        }).where('equipment_id', equipmentID);
        res.send();
        if (visible !== undefined) {
            const equipmentName = (await con('equipment').select('name').where('equipment_id', equipmentID).first()).name;
            emitToAllPlayers(visible ? 'equipment added' : 'equipment removed', { equipmentID, name: equipmentName });
        }
        let skill_name;
        if (skill_id) {
            skill_name = (await con('equipment').select('skill.name as name')
                .join('skill', 'equipment.skill_id', 'skill.skill_id')
                .where('equipment.equipment_id', equipmentID)).name;
        }
        emitToAllPlayers('equipment changed', { equipmentID, name, type, skill_name, damage, range, attacks, ammo });
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.put('/player/skill', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const skillID = req.body.skillID;

    if (!playerID || !skillID) return res.status(401).send();

    try {
        await con('player_skill').insert({ 'player_id': playerID, 'skill_id': skillID, 'value': 0, 'extra_value': 0 });

        const skill = await con('skill').select('skill.skill_id', 'skill.name', 'player_skill.value',
            'specialization.name as specialization_name', 'skill.characteristic_id')
            .join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
            .leftJoin('specialization', 'skill.specialization_id', 'specialization.specialization_id')
            .join('player_characteristic', function () {
                this.on('player_characteristic.characteristic_id', 'skill.characteristic_id')
                    .andOn('player_characteristic.player_id', 'player_skill.player_id')
            })
            .where('player_skill.player_id', playerID)
            .andWhere('player_skill.skill_id', skillID)
            .first();

        if (skill.specialization_name) {
            let skillName = skill.name;
            skill.name = `${skill.specialization_name} (${skillName})`;
        }

        res.send({ skill });
    }
    catch (err) {
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
            .update({ 'value': req.body.value, 'extra_value': req.body.extra_value })
            .where('player_id', playerID)
            .andWhere('skill_id', skillID);
        const classID = (await con('player').select('class_id').where('player_id', playerID).first()).class_id;

        const attributes = await con('attribute').select('attribute.attribute_id',
            'attribute.characteristic_id', 'attribute.skill_id', 'attribute.operation',
            'player_attribute.value', 'player_attribute.total_value', 'player_attribute.max_value')
            .join('player_attribute', 'player_attribute.attribute_id', 'attribute.attribute_id')
            .where('attribute.skill_id', skillID)
            .andWhere('player_attribute.player_id', playerID);

        const updatedAttributes = await updateAttributes(playerID, classID, attributes);
        res.send({ updatedAttributes });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.put('/skill', jsonParser, async (req, res) => {
    const characteristic_id = req.body.characteristicID;
    const name = req.body.name;

    if (characteristic_id === undefined || name === undefined) return res.status(401).send();

    try {
        const skillID = (await con('skill').insert({
            specialization_id: req.body.specializationID || null,
            characteristic_id,
            name
        }))[0];
        res.send({ skillID });
    }
    catch (err) {
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
        await con('skill').update({
            specialization_id: parseInt(req.body.specialization_id) || null,
            characteristic_id,
            name,
            mandatory,
        }).where('skill_id', skillID);
        res.send();

        const skillNames = await con('skill').select('skill.name as skill_name', 'specialization.name as spec_name')
            .leftJoin('specialization', 'skill.specialization_id', 'specialization.specialization_id')
            .where('skill.skill_id', skillID).first();

        let skillName = skillNames.skill_name;
        if (skillNames.spec_name) skillName = `${skillNames.spec_name} (${skillName})`;
        emitToAllPlayers('skill changed', { skillID, name: skillName });
    }
    catch (err) {
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
    }
    catch (err) {
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
            'player_id': playerID,
            'item_id': itemID,
            'description': con('item').select('description').where('item_id', itemID)
        });

        const item = await con('item').select('item.item_id', 'item.name',
            'player_item.description', 'player_item.quantity')
            .join('player_item', 'item.item_id', 'player_item.item_id')
            .where('player_item.player_id', playerID)
            .andWhere('item.item_id', itemID)
            .first();

        res.send({ item });

        io.to('admin').emit('item created', {
            playerID, itemID, name: item.name, description: item.description,
            quantity: item.quantity
        });
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.put('/item', jsonParser, async (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const visible = req.body.visible;

    if (name === undefined || description === undefined ||
        visible === undefined) return res.status(401).send();
    try {
        const itemID = (await con('item').insert({
            name,
            description,
            visible
        }))[0];

        res.send({ itemID });
    }
    catch (err) {
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

        await con('item').update({
            name,
            description: req.body.description,
            visible
        }).where('item_id', itemID);
        res.send();
        if (visible !== undefined) {
            const itemName = (await con('item').select('name').where('item_id', itemID).first()).name;
            emitToAllPlayers(visible ? 'item added' : 'item removed', { itemID, name: itemName });
        }
        emitToAllPlayers('item changed', { itemID, name });
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/class', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const newClassID = req.body.classID || null;

    if (!playerID) return res.status(401).send();

    try {
        const oldClass = await con('player').select('class.class_id', 'class.attribute_id')
            .leftJoin('class', 'class.class_id', 'player.class_id')
            .where('player_id', playerID).first();
        const oldClassID = oldClass.class_id || null;
        await con('player').update('class_id', newClassID).where('player_id', playerID);
        const newClass = await con('class').select('attribute_id')
            .where('class_id', newClassID).first();

        const skills = await con('class_skill').select('skill.skill_id', 'player_skill.value',
            'skill.characteristic_id', 'player_skill.total_value')
            .join('skill', 'skill.skill_id', 'class_skill.skill_id')
            .join('player_skill', 'player_skill.skill_id', 'skill.skill_id')
            .whereIn('class_skill.class_id', [oldClassID, newClassID])
            .andWhere('player_skill.player_id', playerID);
        const skillIDs = skills.map(skill => skill.skill_id);

        const attributes = await con('attribute').select('attribute.attribute_id',
            'attribute.characteristic_id', 'attribute.skill_id', 'attribute.operation',
            'player_attribute.value', 'player_attribute.max_value', 'player_attribute.extra_value')
            .join('player_attribute', 'player_attribute.attribute_id', 'attribute.attribute_id')
            .where(function () {
                this.whereIn('attribute.skill_id', skillIDs);
                this.orWhereIn('attribute.attribute_id', [oldClass.attribute_id || null, newClass?.attribute_id || null]);
            })
            .andWhere('player_attribute.player_id', playerID);

        const updatedSkills = await updateSkills(playerID, newClassID, skills);
        const updatedAttributes = await updateAttributes(playerID, newClassID, attributes);

        res.send({ updatedSkills, updatedAttributes });

        const className = (await con('class').select('name').where('class_id', newClassID).first())?.name || 'Nenhuma';
        io.to('admin').emit('class change', { playerID, className });
    }
    catch (err) {
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
    }
    catch (err) {
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
        await con('player_lineage_node').insert({ player_id: playerID, index: 1 });
        res.send();
        io.to(`player${playerID}`).emit('lineage change', { lineageID });
        io.to(`portrait${playerID}`).emit('lineage change', { lineageID });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/lineage/node', jsonParser, async (req, res) => {
    const playerID = req.session.playerID;
    const index = parseInt(req.body.index);
    const newNodes = [];

    if (!playerID || !index) return res.status(401).send();

    try {
        await con('player_lineage_node').insert({ player_id: playerID, index });
        const player = await con('player').select('lineage_id', 'score').where('player_id', playerID).first();
        const lineageID = player.lineage_id;
        const playerScore = player.score;

        const lineageNode = await con('lineage_node').select('cost', 'level')
            .where('lineage_id', lineageID).andWhere('index', index).first();
        const newScore = playerScore - lineageNode.cost;

        await Promise.all([
            con('player').where('player_id', playerID).update('score', newScore),
            (async () => {
                const conqueredNodes = (await con('player_lineage_node').select('index').where('player_id', playerID)).map(node => node.index);
                const newlyConqueredSubsequentsNode = await con('lineage_node_connection').select()
                    .where('lineage_node_connection.lineage_id', lineageID).andWhere('lineage_node_connection.index', index)
                    .join('lineage_node', function () {
                        this.on('lineage_node.lineage_id', 'lineage_node_connection.lineage_id');
                        this.andOn('lineage_node.index', 'lineage_node_connection.next_index');
                    });

                for (const node of newlyConqueredSubsequentsNode) {
                    const connectedNodes = await con('lineage_node_connection').select('index').where('lineage_id', lineageID)
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
            })()
        ]);
        res.send({ newNodes, newScore });
        io.to('admin').emit('score change', { playerID, newScore });
        io.to(`portrait${playerID}`).emit('lineage node change', { index, level: lineageNode.level });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});
//#endregion

//#region Utils

async function updateAttributes(playerID, classID, attributes) {
    const charIDs = attributes.map(attr => attr.characteristic_id);

    const queries = await Promise.all([
        con('characteristic').select('characteristic.characteristic_id', 'player_characteristic.value')
            .join('player_characteristic', 'characteristic.characteristic_id', 'player_characteristic.characteristic_id')
            .whereIn('characteristic.characteristic_id', charIDs)
            .andWhere('player_characteristic.player_id', playerID),
        con('class').select('attribute_id', 'bonus').where('class_id', classID).first(),
        con('skill').select('skill.skill_id', 'player_skill.total_value')
            .join('player_skill', 'skill.skill_id', 'player_skill.skill_id')
            .where('player_id', playerID)
    ]);

    const charList = queries[0];
    const playerClass = queries[1];
    const skills = queries[2];

    return await Promise.all(attributes.map(async attr => {
        const attributeID = attr.attribute_id;

        const charValue = charList.find(char => char.characteristic_id === attr.characteristic_id).value;
        const skillValue = skills.find(skill => skill.skill_id === attr.skill_id)?.total_value || 0;

        const evaluation = Math.ceil(eval(attr.operation.replace('{characteristic}', charValue)
            .replace('{skill}', skillValue)));
        const bonus = playerClass?.attribute_id === attributeID ? playerClass.bonus : 0;

        const extraValue = evaluation + bonus;
        const totalValue = attr.max_value + extraValue;
        const value = clamp(attr.value, 0, totalValue);

        await con('player_attribute').update({ extra_value: extraValue, value })
            .where('player_id', playerID)
            .andWhere('attribute_id', attributeID);

        io.to('admin').emit('attribute changed', {
            playerID,
            attributeID,
            value,
            totalValue
        });
        io.to(`portrait${playerID}`).emit('attribute changed', {
            attributeID,
            value,
            totalValue
        });

        return { attributeID, extraValue };
    }));

}

async function updateSkills(playerID, classID, skills) {
    const charList = await Promise.all(skills.map(skill => con('characteristic')
        .select('characteristic.*', 'player_characteristic.value')
        .join('skill', 'skill.characteristic_id', 'characteristic.characteristic_id')
        .join('player_characteristic', 'player_characteristic.characteristic_id', 'characteristic.characteristic_id')
        .where('skill.skill_id', skill.skill_id).first()
    ));

    const classSkills = (await con('class_skill').select('skill_id').where('class_id', classID)).map(cs => cs.skill_id);

    return await Promise.all(skills.map(async skill => {
        const skillID = skill.skill_id;
        const charValue = charList.find(char => char.characteristic_id === skill.characteristic_id).value;
        const extraValue = charValue + (classSkills.includes(skillID) ? classBonus : 0);
        const totalValue = extraValue + skill.value;

        await con('player_skill').update('extra_value', extraValue)
            .where('player_id', playerID)
            .andWhere('skill_id', skillID);
        return { skillID, totalValue, extraValue };
    }));

}

async function emitToAllPlayers(ev, payload) {
    const players = await con('player').select('player_id');
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