const express = require('express');
const router = express.Router();
const con = require('../utils/connection');
const io = require('../server').io;
const urlParser = express.urlencoded({ extended: false });

const handlebars = require('hbs').handlebars;

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
    let playerID = req.session.playerID;
    let isAdmin = req.session.isAdmin;

    if (!playerID) return res.redirect('/');
    if (isAdmin) return res.redirect('/sheet/admin/1');

    const queries = [
        //Info: 0
        con.select('info.*', 'player_info.value')
            .from('info')
            .join('player_info', 'info.info_id', 'player_info.info_id')
            .where('player_info.player_id', playerID),

        //Avatar: 1
        con.select('attribute_status.name', 'player_avatar.link', 'player_avatar.attribute_status_id')
            .from('player_avatar')
            .leftJoin('attribute_status', 'player_avatar.attribute_status_id', 'attribute_status.attribute_status_id')
            .where('player_avatar.player_id', playerID),

        //Attributes and Attribute Status: 2
        (async () => {
            const results = await Promise.all([
                //Attributes
                con.select('attribute.*', 'player_attribute.value', 'player_attribute.max_value',
                    'player_attribute.coefficient', 'player_attribute.extra_value', 'player_attribute.total_value')
                    .from('attribute')
                    .join('player_attribute', 'attribute.attribute_id', 'player_attribute.attribute_id')
                    .where('player_attribute.player_id', playerID),

                //Status
                con.select('attribute_status.*', 'player_attribute_status.value')
                    .from('attribute_status')
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
        con.select('spec.*', 'player_spec.value')
            .from('spec')
            .join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
            .where('player_spec.player_id', playerID),

        //Characteristics: 4
        con.select('characteristic.*', 'player_characteristic.value')
            .from('characteristic')
            .join('player_characteristic', 'characteristic.characteristic_id', 'player_characteristic.characteristic_id')
            .where('player_characteristic.player_id', playerID),

        //Player Equipments: 5
        con.select('equipment.*', 'skill.name as skill_name', 'player_equipment.using', 'player_equipment.current_ammo')
            .from('equipment')
            .join('skill', 'equipment.skill_id', 'skill.skill_id')
            .join('player_equipment', 'equipment.equipment_id', 'player_equipment.equipment_id')
            .where('player_equipment.player_id', playerID),

        //Available Equipments: 6
        con.select('equipment_id', 'name')
            .from('equipment')
            .where('visible', true)
            .whereNotIn('equipment_id', con.select('equipment_id').from('player_equipment').where('player_id', playerID))
            .orderBy('name'),

        //Skills: 7
        (async () => {
            const skills = await con('skill').select('skill.skill_id', 'skill.name',
                'player_skill.value', 'specialization.name as specialization_name',
                'skill.characteristic_id', 'player_skill.total_value')
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
        con.select('skill_id', 'name')
            .from('skill')
            .whereNotIn('skill_id', con.select('skill_id').from('player_skill').where('player_id', playerID))
            .orderBy('name'),

        //Items: 9
        con.select('item.item_id', 'item.name', 'player_item.description', 'player_item.quantity')
            .from('item')
            .join('player_item', 'item.item_id', 'player_item.item_id')
            .where('player_item.player_id', playerID),

        //Available Items: 10
        con.select('item_id', 'name')
            .from('item')
            .where('visible', true)
            .whereNotIn('item_id', con.select('item_id').from('player_item').where('player_id', playerID))
            .orderBy('name'),

        //Specializations: 12
        con.select().from('specialization'),

        //Combat Specializations: 13
        con('skill').select('skill.name', 'skill.skill_id'),

        //Notes
        con('player_note').select('value').where('player_id', playerID).first(),

        //Classes List
        (async () => {
            const classes = await con('class').select();

            for (const _class of classes) {
                const skills = await con('class_skill').select('skill_id')
                    .where('class_id', _class.class_id);
                _class.skills = JSON.stringify(skills.map(skill => skill.skill_id));
            }
            return classes;
        })(),

        //Player Class
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
    ];

    try {
        const results = await Promise.all(queries);
        res.render('sheet1',
            {
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
                playerClass: results[15]
            });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.get('/2', async (req, res) => {
    let playerID = req.session.playerID;

    let isAdmin = req.session.isAdmin;

    if (!playerID) return res.redirect('/');
    if (isAdmin) return res.redirect('/sheet/admin/2');

    try {
        const playerLineageID = (await con('player').select('lineage_id').where('player_id', playerID).first())?.lineage_id || null;
        const results = await Promise.all([
            con('extra_info').select('extra_info.*', 'player_extra_info.value')
                .join('player_extra_info', 'extra_info.extra_info_id', 'player_extra_info.extra_info_id')
                .where('player_extra_info.player_id', playerID),
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
            extraInfo: results[0],
            nodeRows: results[1],
            playerLineage: playerLineageID,
            playerScore: results[2]?.score || 0
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.get('/admin/1', async (req, res) => {
    let playerID = req.session.playerID;
    let isAdmin = req.session.isAdmin;

    if (!playerID) return res.redirect('/');

    if (!isAdmin) return res.redirect('/sheet/1');

    const charIDs = await con.select('player_id').from('player').where('admin', false);
    const characters = [];

    try {
        for (let i = 0; i < charIDs.length; i++) {
            let playerID = charIDs[i].player_id;
            const results = await Promise.all([
                //Info: 0
                (async () => {
                    const info = await con.select('info.info_id', 'player_info.value')
                        .from('info')
                        .join('player_info', 'info.info_id', 'player_info.info_id')
                        .where('player_id', playerID)
                        .andWhere('info.name', 'Nome')
                        .first();

                    if (!info.value || info.value.length === 0)
                        info.value = 'Desconhecido';
                    return info;
                })(),

                //Attributes: 1
                con.select('attribute.attribute_id', 'attribute.name', 'attribute.fill_color',
                    'player_attribute.value', 'player_attribute.max_value', 'player_attribute.extra_value',
                    'player_attribute.total_value')
                    .from('attribute')
                    .join('player_attribute', 'attribute.attribute_id', 'player_attribute.attribute_id')
                    .where('player_attribute.player_id', playerID),

                //Specs: 2
                con.select('spec.*', 'player_spec.value')
                    .from('spec')
                    .join('player_spec', 'spec.spec_id', 'player_spec.spec_id')
                    .where('player_spec.player_id', playerID),

                //Characteristics: 3
                con.select('characteristic.characteristic_id', 'characteristic.name', 'player_characteristic.value')
                    .from('characteristic')
                    .join('player_characteristic', 'characteristic.characteristic_id', 'player_characteristic.characteristic_id')
                    .where('player_characteristic.player_id', playerID)
                    .andWhere('characteristic.name', 'Deslocamento'),

                //Combat: 4
                con.select('equipment.equipment_id', 'player_equipment.using', 'equipment.name', 'equipment.damage', 'equipment.range', 'equipment.attacks')
                    .from('equipment')
                    .join('player_equipment', 'equipment.equipment_id', 'player_equipment.equipment_id')
                    .where('player_equipment.player_id', playerID),

                //Items: 5
                con.select('item.item_id', 'item.name', 'player_item.description')
                    .from('item')
                    .join('player_item', 'item.item_id', 'player_item.item_id')
                    .where('player_item.player_id', playerID),

                //Lineages: 6
                con('lineage').select(),

                //Player Lineage, Score and class name: 7
                con('player').select('player.lineage_id', 'player.score', 'class.name as class_name')
                    .leftJoin('class', 'class.class_id', 'player.class_id')
                    .where('player.player_id', playerID).first(),
            ]);

            characters.push({
                playerID: playerID,
                name: results[0],
                attributes: results[1],
                specs: results[2],
                characteristics: results[3],
                equipments: results[4],
                items: results[5],
                lineage: results[6],
                player: results[7],
            });
        }

        const results = await Promise.all([
            //Admin Notes: 0
            con.select('value')
                .from('player_note')
                .where('player_id', playerID)
                .first(),
        ]);

        res.render('sheetadmin1', {
            characters,
            adminNotes: results[0]
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).end();
    }
});

router.get('/admin/2', async (req, res) => {
    let playerID = req.session.playerID;
    let isAdmin = req.session.isAdmin;

    if (!playerID) return res.redirect('/');

    if (!isAdmin) return res.redirect('/sheet/2');

    const queries = [
        //All Equipments: 0
        con.select('equipment.*', 'skill.name as skill_name')
            .from('equipment')
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
        return res.status(500).end();
    }
})

//#endregion

//#region CRUDs

router.post('/player/info', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let infoID = req.body.infoID;
    let value = req.body.value;

    try {
        await con('player_info')
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('info_id', infoID);
        res.end();
        io.to('admin').emit('info changed', { playerID, infoID, value });
        io.to(`portrait${playerID}`).emit('info changed', { infoID, value });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/attribute', urlParser, async (req, res) => {
    const playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    const attributeID = req.body.attributeID;
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
            attrID: attributeID,
            totalValue: result.total_value,
            value: result.value,
        };

        io.to('admin').emit('attribute changed', { playerID, attributeID, value: data.value, totalValue: data.totalValue });
        io.to(`portrait${playerID}`).emit('attribute changed', data);
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/attributestatus', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let attrStatusID = req.body.attributeStatusID;
    let checked = req.body.checked === 'true' ? true : false;

    try {
        await con('player_attribute_status')
            .update('value', checked)
            .where('player_id', playerID)
            .andWhere('attribute_status_id', attrStatusID);

        io.to(`portrait${playerID}`).emit('attribute status changed', { attrStatusID, value: checked });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/spec', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let specID = req.body.specID;
    let value = req.body.value;

    try {
        await con('player_spec')
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('spec_id', specID);

        io.to('admin').emit('spec changed', { playerID, specID, value });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/characteristic', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let charID = req.body.characteristicID;
    let value = req.body.value || 0;
    try {
        await con('player_characteristic')
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('characteristic_id', charID);

        io.to('admin').emit('characteristic changed', { playerID, charID, value });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/player/equipment', urlParser, async (req, res) => {
    const playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    const equipmentID = req.body.equipmentID;

    try {
        await con('player_equipment').insert({
            'player_id': playerID,
            'equipment_id': equipmentID,
            'current_ammo': '-',
            'using': false
        });

        const equip = await con.select('equipment.*', 'skill.name as skill_name', 'player_equipment.using', 'player_equipment.current_ammo')
            .from('equipment')
            .join('skill', 'equipment.skill_id', 'skill.skill_id')
            .join('player_equipment', 'equipment.equipment_id', 'player_equipment.equipment_id')
            .where('player_equipment.player_id', playerID)
            .andWhere('equipment.equipment_id', equipmentID)
            .first();
        const html = handlebars.partials.equipments(equip);
        res.send({ html });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }

    try {
        const equip = await con.select('name', 'damage', 'range', 'attacks')
            .from('equipment')
            .where('equipment_id', equipmentID)
            .first();

        io.to('admin').emit('equipment changed', {
            playerID, equipmentID, using: false, name: equip.name,
            damage: equip.damage, range: equip.range, attacks: equip.attacks, type: 'create'
        });
    }
    catch (err) {
        console.error('Could not call equipment changed event.');
        console.error(err);
    }
});

router.post('/player/equipment', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let equipmentID = req.body.equipmentID;
    let using = req.body.using;
    if (using) using = using === 'true' ? true : false;
    let currentAmmo = req.body.currentAmmo;

    try {
        await con('player_equipment')
            .update({ 'using': using, 'current_ammo': currentAmmo })
            .where('player_id', playerID)
            .andWhere('equipment_id', equipmentID);
        io.to('admin').emit('equipment changed', { playerID, equipmentID, using, type: 'update' });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.delete('/player/equipment', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let equipmentID = req.body.equipmentID;

    try {
        await con('player_equipment')
            .where('player_id', playerID)
            .andWhere('equipment_id', equipmentID)
            .del();
        io.to('admin').emit('equipment changed', { playerID, equipmentID, type: 'delete' });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/equipment', urlParser, async (req, res) => {
    try {
        let visible;
        if (req.body.visible === 'true') visible = true;
        else if (req.body.visible === 'false') visible = false;
        const equipmentID = (await con.insert({
            'name': req.body.name,
            'type': req.body.type,
            'skill_id': req.body.skillID,
            'damage': req.body.damage,
            'range': req.body.range,
            'attacks': req.body.attacks,
            'ammo': req.body.ammo,
            'visible': visible
        }).into('equipment'))[0];

        res.send({ equipmentID });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/equipment', urlParser, async (req, res) => {

    if (!req.session.isAdmin)
        return res.status(401).send();

    try {
        let visible;
        if (req.body.visible === 'true') visible = true;
        else if (req.body.visible === 'false') visible = false;
        await con('equipment').update({
            'name': req.body.name,
            'type': req.body.type,
            'skill_id': req.body.skillID,
            'damage': req.body.damage,
            'range': req.body.range,
            'attacks': req.body.attacks,
            'ammo': req.body.ammo,
            'visible': visible,
        }).where('equipment_id', req.body.equipmentID);
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.delete('/equipment', urlParser, async (req, res) => {
    if (!req.session.isAdmin)
        return res.status(401).send();

    try {
        await con('equipment').where('equipment_id', req.body.equipmentID).del();
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/player/skill', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let skillID = req.body.skillID;

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

        const html = handlebars.partials.skills(skill);

        res.send({ html });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/skill', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    try {
        await con('player_skill')
            .update({ 'value': req.body.value, 'extra_value': req.body.extra_value })
            .where('player_id', playerID)
            .andWhere('skill_id', req.body.skillID);

        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/skill', urlParser, async (req, res) => {
    let specializationID = req.body.specializationID;
    if (specializationID === '0') specializationID = null;
    try {
        let skillID = (await con('skill').insert({
            'specialization_id': specializationID,
            'characteristic_id': req.body.characteristicID,
            'name': req.body.name
        }))[0];
        res.send({ skillID });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/skill', urlParser, async (req, res) => {
    if (!req.session.isAdmin)
        return res.status(401).send();

    let specializationID = req.body.specializationID;
    if (specializationID === '0') specializationID = null;
    let mandatory;
    if (req.body.mandatory === 'true') mandatory = true;
    else if (req.body.mandatory === 'false') mandatory = false;

    try {
        await con('skill').update({
            'specialization_id': specializationID,
            'characteristic_id': req.body.characteristicID,
            'name': req.body.name,
            'mandatory': mandatory,
        }).where('skill_id', req.body.skillID);
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.delete('/skill', urlParser, async (req, res) => {
    if (!req.session.isAdmin)
        return res.status(401).send();

    try {
        await con('skill').where('skill_id', req.body.skillID).del();
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/player/item', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let itemID = req.body.itemID;

    try {
        await con('player_item').insert({
            'player_id': playerID,
            'item_id': itemID,
            'description': con.select('description').from('item').where('item_id', itemID)
        });

        const item = await con('item').select('item.item_id', 'item.name',
            'player_item.description', 'player_item.quantity')
            .join('player_item', 'item.item_id', 'player_item.item_id')
            .where('player_item.player_id', playerID)
            .andWhere('item.item_id', itemID)
            .first();

        const html = handlebars.partials.items(item);

        res.send({ html });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }

    try {
        const query = await con.select('item.name', 'player_item.description')
            .from('item')
            .join('player_item', 'item.item_id', 'player_item.item_id')
            .where('item.item_id', itemID)
            .andWhere('player_item.player_id', playerID)
            .first();

        let name = query.name;
        let description = query.description;

        io.to('admin').emit('item changed', { playerID, itemID, name, description, type: 'create' });
    }
    catch (err) {
        console.error('Could not call new item event.');
        console.error(err);
    }
});

router.post('/player/item', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let itemID = req.body.itemID;
    let description = req.body.description;
    let quantity = req.body.quantity;

    try {
        await con('player_item')
            .update({ description, quantity })
            .where('player_id', playerID)
            .andWhere('item_id', itemID);

        io.to('admin').emit('item changed', { playerID, itemID, description, type: 'update' });

        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.delete('/player/item', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let itemID = req.body.itemID;

    try {
        await con('player_item')
            .where('player_id', playerID)
            .andWhere('item_id', itemID)
            .del();

        io.to('admin').emit('item changed', { playerID, itemID, type: 'delete' });
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.put('/item', urlParser, async (req, res) => {
    try {
        let visible;
        if (req.body.visible === 'true') visible = true;
        else if (req.body.visible === 'false') visible = false;
        const query = await con('item').insert({
            'name': req.body.name,
            'description': req.body.description,
            'visible': visible
        });

        res.send({ itemID: query[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/item', urlParser, async (req, res) => {

    if (!req.session.isAdmin)
        return res.status(401).send();

    let visible;
    if (req.body.visible === 'true') visible = true;
    else if (req.body.visible === 'false') visible = false;

    try {
        await con('item').update({
            'name': req.body.name,
            'description': req.body.description,
            'visible': visible
        }).where('item_id', req.body.itemID);
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.delete('/item', urlParser, async (req, res) => {
    if (!req.session.isAdmin)
        return res.status(401).send();

    try {
        await con('item').where('item_id', req.body.itemID).del();
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/player/extrainfo', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    let extraInfoID = req.body.extraInfoID;
    let value = req.body.value;

    try {
        await con('player_extra_info')
            .update('value', value)
            .where('player_id', playerID)
            .andWhere('extra_info_id', extraInfoID);

        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

router.post('/admin/note', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();
    if (!req.session.isAdmin)
        return res.status(401).send();

    let value = req.body.value;

    try {
        await con('player_note').update('value', value).where('player_id', playerID);
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).end();
    }
})

router.post('/player/note', urlParser, async (req, res) => {
    let playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    try {
        await con('player_note')
            .update('value', req.body.value)
            .where('player_id', playerID);
        res.send();
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/class', urlParser, async (req, res) => {
    const playerID = req.session.playerID;

    if (!playerID)
        return res.status(401).end();

    try {
        const class_id = parseInt(req.body.id) || null;

        await con('player').update('class_id', class_id).where('player_id', playerID);
        res.send();

        const className = (await con('class').select('name').where('class_id', class_id).first())?.name || 'Nenhuma';
        io.to('admin').emit('class change', { playerID, className });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});

router.post('/player/score', urlParser, async (req, res) => {
    const score = parseInt(req.body.value) || 0;
    const playerID = req.body.playerID;

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

router.post('/player/lineage', urlParser, async (req, res) => {
    const lineageID = parseInt(req.body.lineageID) || null;
    const playerID = parseInt(req.body.playerID);
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

router.post('/player/lineage/node', urlParser, async (req, res) => {
    const playerID = req.session.playerID;
    const index = parseInt(req.body.index);
    const newScore = parseInt(req.body.newScore);
    const newNodes = [];
    try {
        await con('player_lineage_node').insert({ player_id: playerID, index }),
            await Promise.all([
                con('player').where('player_id', playerID).update('score', newScore),
                (async () => {
                    const lineageID = (await con('player').select('lineage_id').where('player_id', playerID).first()).lineage_id;

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
        res.send({ newNodes });
        io.to('admin').emit('score change', { playerID, newScore });
        io.to(`portrait${playerID}`).emit('lineage node change', { index });
    }
    catch (err) {
        console.error(err);
        res.status(500).send();
    }
});
//#endregion

module.exports = router;