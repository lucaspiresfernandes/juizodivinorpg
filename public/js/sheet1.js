const defaultDiceRoll = 20;

const diceResultContent = $('#diceResultContent');
diceResultContent.hide();
const diceResultDescription = $('#diceResultDescription');
diceResultDescription.hide();
const loading = $('.loading');
const goodRate = 0.5, extremeRate = 0.2;

const diceRollModal = new bootstrap.Modal($('#diceRoll')[0]);
const uploadAvatarModal = new bootstrap.Modal($('#uploadAvatar')[0]);
const generalDiceModal = new bootstrap.Modal($('#generalDiceRoll')[0]);
const addSkillModal = new bootstrap.Modal($('#addSkill')[0]);
const createSkillModal = new bootstrap.Modal($('#createSkill')[0]);
const addEquipmentModal = new bootstrap.Modal($('#addEquipment')[0]);
const createEquipmentModal = new bootstrap.Modal($('#createEquipment')[0]);
const addItemModal = new bootstrap.Modal($('#addItem')[0]);
const createItemModal = new bootstrap.Modal($('#createItem')[0]);

const failureToast = new bootstrap.Toast($('#failureToast')[0], { delay: 4000 });
const failureToastBody = $('#failureToast > .toast-body');

//General
function showFailureToastMessage(err) {
    console.error(err);
    failureToastBody.text(`Erro ao tentar aplicar mudança - ${err.text}`);
    failureToast.show();
}

function rollDice(
    num = -1,
    max = defaultDiceRoll,
    showBranches = true,
    sucessTypeResolver = defaultSuccessTypeResolver
) {
    diceRollModal.show();
    loading.show();

    $.ajax('/dice', {
        data: { dices: [{ n: 1, num: max }] },
        success: (data) => {
            let roll = data.results[0];
            const successType = sucessTypeResolver(num, roll, showBranches);
            loading.hide();

            diceResultContent.text(roll).fadeIn('slow', () => {
                if (num === -1)
                    return;

                diceResultDescription.text(successType.description)
                    .fadeIn('slow');
            });
        },
        error: showFailureToastMessage
    });
}

function rollDices(dices) {
    diceRollModal.show();
    loading.show();
    $.ajax('/dice/', {
        data: { dices },
        success: data => {
            let results = data.results;
            let sum = data.results.reduce((a, b) => a + b);

            loading.hide();
            diceResultContent.text(sum)
                .fadeIn('slow', () => {
                    if (results.length <= 1)
                        return;
                    diceResultDescription.text(results.join(' + '))
                        .fadeIn('slow');
                });
        },
        error: showFailureToastMessage
    });
}

$('#diceRoll').on('hidden.bs.modal', ev => {
    diceResultContent.text('')
        .hide();
    diceResultDescription.text('')
        .hide();
})

function defaultSuccessTypeResolver(number, roll, showBranches) {
    let resolved;

    const f2 = Math.floor(number / 2);
    const f5 = Math.floor(number / 5);
    const f10 = Math.floor(number / 10);
    const f12 = Math.floor(number / 12);
    const f20 = Math.floor(number / 20);

    if (roll === 1 && number < 20)
        resolved = { description: 'Desastre!', isSuccess: false };

    else if (roll >= 1 && roll <= 20 - number)
        resolved = { description: 'Fracasso', isSuccess: false };

    else if (roll > 20 - number && roll <= 20 - f2)
        resolved = { description: 'Sucesso', isSuccess: true };

    else if (roll > 20 - f2 && roll <= 20 - f5)
        resolved = { description: 'Bom', isSuccess: true };

    else
        resolved = { description: 'Extremo', isSuccess: true };

    if (roll > 20 - f10 && roll <= 20 - f12)
        resolved = { description: "Crítico Normal", isSuccess: true };

    else if (roll > 20 - f12 && roll <= 20 - f20)
        resolved = { description: "Crítico Bom", isSuccess: true };

    else if (roll > 20 - f20 && number >= 30)
        resolved = { description: "Crítico Extremo", isSuccess: true };

    if (!showBranches)
        resolved.description = resolved.isSuccess ? 'Sucesso' : 'Fracasso';

    return resolved;
}

function attributeSuccessTypeResolver(num, roll, showBranches) {
    if (showBranches) {
        if (roll === 100)
            return { description: 'Desastre', isSuccess: false };
        if (roll === 1)
            return { description: 'Perfeito', isSuccess: true };
        if (roll <= num * extremeRate)
            return { description: 'Extremo', isSuccess: true };
        if (roll <= num * goodRate)
            return { description: 'Bom', isSuccess: true };
    }
    if (roll <= num)
        return { description: 'Sucesso', isSuccess: true };
    if (roll > num)
        return { description: 'Fracasso', isSuccess: false };

    return { description: 'Unknown', isSuccess: false };
}

function resolveDices(str) {
    const diceCollection = str.trim().toLowerCase();

    const options = diceCollection.split('/');
    if (options.length > 1) {
        const selected = parseInt(prompt('Escolha dentre as opções de rolagem a seguir:\n' +
            options.map((opt, i) => `${i + 1}: ${opt}`).join('\n')));

        if (isNaN(selected) || selected < 1 || selected > options.length) return;

        return resolveDices(options[selected - 1]);
    }

    const dices = diceCollection.split('+');
    const arr = [];
    for (let i = 0; i < dices.length; i++) resolveDice(dices[i], arr);
    return arr;
}

function resolveDice(dice, arr) {
    if (dice.includes('db/')) {
        const div = parseInt(dice.split('/')[1]) || 1;

        const db = $('.spec-field[name="Dano Bônus"]').val();
        const split = db.split('d');
        let text = '';

        if (split.length === 1)
            text = Math.round(parseInt(split[0]) / div).toString();
        else
            text = `${split[0]}d${Math.round(parseInt(split[1]) / div)}`;

        return resolveDice(text, arr);
    }
    if (dice.includes('db'))
        return resolveDice($('.spec-field[name="Dano Bônus"]').val(), arr);

    let split = dice.split('d');

    if (split.length === 1)
        return arr.push({ n: 0, num: dice });

    let n = parseInt(split[0]) || 1;
    let num = parseInt(split[1]);
    arr.push({ n, num });
}

function clamp(n, min, max) {
    if (n < min)
        return min;
    if (n > max)
        return max;
    return n;
}

function updateAttributeBar(min, cur, max, bar) {
    bar.attr('min', min);
    bar.attr('current', cur);
    bar.attr('max', max);
    let coefficient = ((cur / max) * 100) || 0;
    bar.css('width', `${coefficient}%`);
}

$('#generalDiceRoll').on('hidden.bs.modal', ev => $(".general-dice-roll").text("0"));

function generalDiceClick(event) {
    generalDiceModal.hide();
    const diceElements = $('.general-dice-roll');

    const dicesArray = [];
    for (const dice of diceElements) {
        const el = $(dice);
        const n = el.text().trim();

        if (n === '0')
            continue;

        const num = el.attr('dice');
        dicesArray.push(`${n}d${num}`);
    }
    const dicesText = dicesArray.join('+');

    const dices = resolveDices(dicesText);
    if (dices) rollDices(dices);
}

//Info
function infoChange(ev, infoID) {
    let value = $(ev.target).val();

    $.ajax('/sheet/player/info',
        {
            method: 'POST',
            data: { infoID, value },
            error: showFailureToastMessage
        });
}

//Avatar
const avatarImage = $('#avatar');
const avatarLinks = new Map();
const uploadAvatarContainer = $('#uploadAvatarContainer');
const uploadAvatarButton = $('#uploadAvatarButton');
const uploadAvatarCloseButton = $('#uploadAvatarCloseButton');

$('#uploadAvatar').on('hidden.bs.modal', () => {
    uploadAvatarButton.prop('disabled', false);
    uploadAvatarCloseButton.prop('disabled', false);
    uploadAvatarContainer.show();
    loading.hide();
});

function uploadAvatarClick(event) {
    uploadAvatarButton.prop('disabled', true);
    uploadAvatarCloseButton.prop('disabled', true);
    uploadAvatarContainer.hide();
    loading.show();

    const avatars = $('.avatar-field').map((i, el) => {
        const avatar = $(el);
        let id = parseInt(avatar.attr('avatar-id')) || null;
        return { attribute_status_id: id, link: avatar.val() };
    }).get();

    $.ajax('/avatar',
        {
            method: 'POST',
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(avatars),
            success: () => {
                evaluateAvatar();
                uploadAvatarModal.hide();
            },
            error: err => {
                uploadAvatarModal.hide();
                showFailureToastMessage(err);
            }
        });
}

function evaluateAvatar() {
    const field = $('.attribute-status-field:checked').first();
    let id = field.attr('attribute-status-id');
    if (field.length === 0) id = 0;
    avatarImage.attr('src', `/avatar/${id}?v=${Date.now()}`);
}
evaluateAvatar();

//Attributes
function attributeBarClick(ev, attributeID) {
    const desc = $(`#attributeDesc${attributeID}`);
    const bar = $(`#attributeBar${attributeID}`);

    const split = desc.text().split('/');
    const min = parseInt(bar.attr('min'));
    const cur = parseInt(split[0]);
    const max = parseInt(split[1]);

    let newMax = prompt('Digite o novo máximo do atributo:', max);

    if (!newMax || isNaN(newMax) || newMax === max)
        return;

    if (newMax < min) newMax = min;

    let newCur = clamp(cur, 0, newMax);

    $.ajax('/sheet/player/attribute', {
        method: 'POST',
        data: { attributeID, value: newCur, maxValue: newMax },
        success: () => {
            desc.text(`${newCur}/${newMax}`);
            updateAttributeBar(min, newCur, newMax, bar);
        },
        error: showFailureToastMessage
    });
}

function attributeButtonClick(ev, attributeID, coef) {
    const desc = $(`#attributeDesc${attributeID}`);
    const bar = $(`#attributeBar${attributeID}`);

    if (ev.shiftKey) coef *= 10;

    const split = desc.text().split('/');
    const min = parseInt(bar.attr('min'));
    const cur = parseInt(split[0]);
    const max = parseInt(split[1]);

    let newCur = clamp(cur + coef, 0, max);

    if (cur === newCur)
        return;

    desc.text(`${newCur}/${max}`);

    updateAttributeBar(min, newCur, max, bar);

    $.ajax('/sheet/player/attribute', {
        method: 'POST',
        data: { attributeID, value: newCur },
        error: err => {
            desc.text(`${cur}/${max}`);
            updateAttributeBar(min, cur, max, bar);
            showFailureToastMessage(err);
        }
    });
}

function attributeDiceClick(ev, id) {
    const exp = parseInt($('.spec-field[name="Exposição Pavorosa"]').val());
    rollDice(exp, 100, false, attributeSuccessTypeResolver);
}

//Attribute Status
function attributeStatusChange(ev, attributeStatusID) {
    const checked = $(ev.target).prop('checked');
    evaluateAvatar();
    $.ajax('/sheet/player/attributestatus',
        {
            method: 'POST',
            data: { attributeStatusID, checked },
            error: showFailureToastMessage
        });
}

//Specs
function specChange(ev, specID) {
    let value = $(ev.target).val();
    $.ajax('/sheet/player/spec',
        {
            method: 'POST',
            data: { specID, value },
            error: showFailureToastMessage
        });
}

//Characteristics
function characteristicChange(ev, characteristicID) {
    let value = $(ev.target).val();

    const skills = $(`.skill-total[characteristic-id="${characteristicID}"]`);
    for (let i = 0; i < skills.length; i++) {
        const skill = skills.eq(i);
        const skillValue = skill.parents('.skill-container').find('.skill-field').val();
        skill.text(parseInt(skillValue) + parseInt(value));
    }

    setAttributeBarMinimum($(`.attribute-bar[characteristic-id="${characteristicID}"]`));

    $.ajax('/sheet/player/characteristic', {
        method: 'POST',
        data: { characteristicID, value },
        error: showFailureToastMessage
    });
}

function characteristicDiceClick(ev, id) {
    let num = $(`#characteristic${id}`).val();
    rollDice(num, defaultDiceRoll);
}

//Equipments
const equipmentTable = $('#equipmentTable');

const addEquipmentContainer = $('#addEquipmentContainer');
const addEquipmentList = $('#addEquipmentList');
const addEquipmentButton = $('#addEquipmentButton');
const addEquipmentCloseButton = $('#addEquipmentCloseButton');
const addEquipmentCreate = $('#addEquipmentCreate');

const createEquipmentContainer = $('#createEquipmentContainer');
const createEquipmentName = $('#createEquipmentName');
const createEquipmentType = $('#createEquipmentType');
const createEquipmentDamage = $('#createEquipmentDamage');
const createEquipmentRange = $('#createEquipmentRange');
const createEquipmentAttacks = $('#createEquipmentAttacks');
const createEquipmentAmmo = $('#createEquipmentAmmo');
const createEquipmentSpecialization = $('#combatSpecializationList');
const createEquipmentButton = $('#createEquipmentButton');
const createEquipmentCloseButton = $('#createEquipmentCloseButton');

$('#createEquipment').on('hidden.bs.modal', () => {
    createEquipmentButton.prop('disabled', false);
    createEquipmentCloseButton.prop('disabled', false);
    createEquipmentContainer.show();
    loading.hide();
});

$('#addEquipment').on('hidden.bs.modal', () => {
    addEquipmentCloseButton.prop('disabled', false);
    addEquipmentCreate.prop('disabled', false);
    addEquipmentContainer.show();
    loading.hide();
});

function addEquipmentClick(event) {
    addEquipmentButton.prop('disabled', true);
    addEquipmentCloseButton.prop('disabled', true);
    addEquipmentCreate.prop('disabled', true);
    addEquipmentContainer.hide();
    loading.show();

    let equipmentID = addEquipmentList.val();

    $.ajax('/sheet/player/equipment',
        {
            method: 'PUT',
            data: { equipmentID },
            success: (data) => {
                addEquipmentModal.hide();

                $(`#addEquipmentOption${equipmentID}`).remove();

                equipmentTable.append(data.html);

                addEquipmentButton.prop('disabled', addEquipmentList.children().length === 0);
            },
            error: err => {
                addEquipmentModal.hide();
                showFailureToastMessage(err);
            }
        });
}

function deleteEquipmentClick(event, equipmentID) {
    if (!confirm("Você realmente quer remover esse equipamento?"))
        return;

    $.ajax('/sheet/player/equipment',
        {
            method: 'DELETE',
            data: { equipmentID },
            success: () => {
                const opt = $(document.createElement('option'));
                opt.attr('id', `addEquipmentOption${equipmentID}`);
                opt.val(equipmentID);
                opt.text($(`#equipmentName${equipmentID}`).text());

                addEquipmentList.append(opt);
                $(`#equipmentRow${equipmentID}`).remove();

                addEquipmentButton.prop('disabled', false);
            },
            error: showFailureToastMessage
        });
}

function createEquipmentClick(event) {
    const name = createEquipmentName.val();
    const skillID = createEquipmentSpecialization.val();
    const type = createEquipmentType.val();
    const damage = createEquipmentDamage.val();
    const range = createEquipmentRange.val();
    const attacks = createEquipmentAttacks.val();
    const ammo = createEquipmentAmmo.val();

    createEquipmentButton.prop('disabled', true);
    createEquipmentCloseButton.prop('disabled', true);
    createEquipmentContainer.hide();
    loading.show();

    $.ajax('/sheet/equipment',
        {
            method: 'PUT',
            data: { name, skillID, type, damage, range, attacks, ammo, visible: true },
            success: (data) => {
                const id = data.equipmentID;
                const opt = $(document.createElement('option'));
                opt.attr('id', `addEquipmentOption${id}`);
                opt.val(id);
                opt.text(name);

                createEquipmentModal.hide();
                addEquipmentList.append(opt);
                addEquipmentButton.prop('disabled', false);
            },
            error: err => {
                createEquipmentModal.hide();

                showFailureToastMessage(err);
            }
        });
}

function equipmentUsingChange(ev, equipmentID) {
    const using = $(ev.target).prop('checked');
    $.ajax('/sheet/player/equipment',
        {
            method: 'POST',
            data: { equipmentID, using },
            error: showFailureToastMessage
        });
}

function equipmentAmmoChange(ev, equipmentID) {
    const currentAmmo = $(ev.target);
    let curAmmo = parseInt(currentAmmo.val());
    let maxAmmo = parseInt($(`#equipmentMaxAmmo${equipmentID}`).text());

    if (isNaN(maxAmmo)) {
        currentAmmo.val('-');
        return alert('Esse equipamento não possui munição.');
    }
    else if (curAmmo > maxAmmo) {
        currentAmmo.val('-');
        return alert('Você não pode ter mais balas do que a capacidade do equipamento.');
    }

    postCurrentAmmo(equipmentID, currentAmmo.val());
}

function equipmentDiceClick(ev, id) {
    const using = $(`#equipmentUsing${id}`).prop('checked');
    if (!using) return alert('Você não está usando esse equipamento.');

    const damageField = $(`#equipmentDamage${id}`);
    const ammoTxt = $(`#equipmentAmmo${id}`);
    let ammo = parseInt(ammoTxt.val());
    let maxAmmo = parseInt($(`#equipmentMaxAmmo${id}`).text());

    if (!isNaN(maxAmmo) && (isNaN(ammo) || ammo <= 0))
        return alert('Você não tem munição para isso.');

    let dices = resolveDices(damageField.text());
    if (!dices) return;

    if (!isNaN(ammo)) {
        ammoTxt.val(--ammo);
        postCurrentAmmo(id, ammo);
    }

    rollDices(dices);
}

function postCurrentAmmo(equipmentID, currentAmmo) {
    $.ajax('/sheet/player/equipment', {
        method: 'POST',
        data: { equipmentID, currentAmmo },
        error: showFailureToastMessage
    });
}


//Skills
const skillTable = $('#skillTable');

const skillsContainer = $('.skill-container');
const skillLabels = $('.skill-label');

const addSkillContainer = $('#addSkillContainer');
const addSkillButton = $('#addSkillButton');
const addSkillCloseButton = $('#addSkillCloseButton');
const addSkillCreateButton = $('#addSkillCreateButton');
const addSkillList = $('#addSkillList');

const createSkillContainer = $('#createSkillContainer');
const createSkillButton = $('#createSkillButton');
const createSkillCloseButton = $('#createSkillCloseButton');
const createSkillName = $('#createSkillName');
const createSkillCharacteristic = $('#createSkillCharacteristic');
const createSkillSpecialization = $('#createSkillSpecialization');

$('#createSkill').on('hidden.bs.modal', () => {
    createSkillButton.prop('disabled', false);
    createSkillCloseButton.prop('disabled', false);
    createSkillContainer.show();
    loading.hide();
});

$('#addSkill').on('hidden.bs.modal', () => {
    addSkillContainer.show();
    addSkillCreateButton.prop('disabled', false);
    addSkillCloseButton.prop('disabled', false);
    loading.hide();
});

function createSkillClick(event) {
    createSkillContainer.hide();
    createSkillButton.prop('disabled', true);
    createSkillCloseButton.prop('disabled', true);
    loading.show();

    const specializationID = createSkillSpecialization.val();
    const characteristicID = createSkillCharacteristic.val();
    const name = createSkillName.val();

    $.ajax('/sheet/skill',
        {
            method: 'PUT',
            data: { name, specializationID, characteristicID },
            success: (data) => {
                createSkillModal.hide();

                const id = data.skillID;
                const opt = $(document.createElement('option'));
                opt.attr('id', `createSkillOption${id}`);
                opt.val(id);
                opt.text(name);
                addSkillList.append(opt);

                addSkillButton.prop('disabled', false);
            },
            error: err => {
                createSkillModal.hide();

                showFailureToastMessage(err);
            }
        });
}

function addSkillClick(ev) {
    addSkillContainer.hide();
    addSkillButton.prop('disabled', true);
    addSkillCloseButton.prop('disabled', true);
    addSkillCreateButton.prop('disabled', true);
    loading.show();

    let skillID = addSkillList.val();

    $.ajax('/sheet/player/skill',
        {
            method: 'PUT',
            data: { skillID },
            success: (data) => {
                addSkillModal.hide();

                $(`#addSkillOption${skillID}`).remove();
                skillTable.append(data.html);

                addSkillButton.prop('disabled', addSkillList.children().length === 0);
            },
            error: err => {
                addSkillModal.hide();

                showFailureToastMessage(err);
            }
        });
}

function skillSearchBarInput(ev) {
    const searchBar = $(ev.target);

    if (searchBar.val() === '') {
        for (let i = 0; i < skillsContainer.length; i++)
            skillsContainer[i].hidden = false;
        return;
    }

    let str = searchBar.val().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    for (let i = 0; i < skillsContainer.length; i++) {
        const cont = skillsContainer[i];
        let txt = skillLabels[i].textContent.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        cont.hidden = !txt.includes(str);
    }
}

function skillChange(event, id) {
    let value = parseInt($(event.target).val());

    //Characteristic
    const total = $(event.target).parents('.skill-container').find('.skill-total');
    const charID = total.attr('characteristic-id');
    const characteristicValue = parseInt($(`#characteristic${charID}`).val());
    total.text(characteristicValue + value);

    //Attribute
    setAttributeBarMinimum($(`.attribute-bar[skill-id="${id}"]`));

    $.ajax('/sheet/player/skill', {
        method: 'POST',
        data: { skillID: id, value: value },
        error: showFailureToastMessage
    });
}

function skillCheckChange(event, id) {
    const checked = $(event.target).prop('checked');

    $.ajax('/sheet/player/skill', {
        method: 'POST',
        data: { skillID: id, checked: checked },
        error: err => {
            showFailureToastMessage(err);
        }
    });
}

function skillDiceClick(event, id) {
    const num = parseInt($(`#skillTotal${id}`).text());
    rollDice(num, defaultDiceRoll, true);
}

//Items
const itemTable = $('#itemTable');

const addItemContainer = $('#addItemContainer');
const addItemButton = $('#addItemButton');
const addItemCloseButton = $('#addItemCloseButton');
const addItemCreateButton = $('#addItemCreateButton');
const addItemList = $('#addItemList');

const createItemContainer = $('#createItemContainer');
const createItemButton = $('#createItemButton');
const createItemCloseButton = $('#createItemCloseButton');
const createItemName = $('#createItemName');
const createItemDescription = $('#createItemDescription');

$('#createItem').on('hidden.bs.modal', () => {
    createItemButton.prop('disabled', false);
    createItemCloseButton.prop('disabled', false);
    createItemContainer.show();
    loading.hide();
});

$('#addItem').on('hidden.bs.modal', () => {
    addItemContainer.show();
    addItemCreateButton.prop('disabled', false);
    addItemCloseButton.prop('disabled', false);
    loading.hide();
});

function addItemClick(ev) {
    addItemContainer.hide();
    addItemButton.prop('disabled', true);
    addItemCloseButton.prop('disabled', true);
    addItemCreateButton.prop('disabled', true);
    loading.show();

    let itemID = addItemList.val();

    $.ajax('/sheet/player/item',
        {
            method: 'PUT',
            data: { itemID },
            success: (data) => {
                addItemModal.hide();

                $(`#addItemOption${itemID}`).remove();
                itemTable.append(data.html);

                addItemButton.prop('disabled', addItemList.children().length === 0);
            },
            error: err => {
                addItemModal.hide();

                showFailureToastMessage(err);
            }
        });
}

function createItemClick(ev) {
    createItemContainer.hide();
    createItemButton.prop('disabled', true);
    createItemCloseButton.prop('disabled', true);
    loading.show();

    const name = createItemName.val();
    const description = createItemDescription.val();
    $.ajax('/sheet/item',
        {
            method: 'PUT',
            data: { name, description, visible: true },
            success: (data) => {
                createItemModal.hide();

                const id = data.itemID;
                const opt = $(document.createElement('option'));
                opt.attr('id', `addItemOption${id}`);
                opt.val(id);
                opt.text(name);
                addItemList.append(opt);

                addItemButton.prop('disabled', false);
            },
            error: err => {
                createItemModal.hide();

                showFailureToastMessage(err);
            }
        });
}

function deleteItemClick(event, itemID) {
    if (!confirm("Você realmente quer remover esse equipamento?"))
        return;

    $.ajax('/sheet/player/item',
        {
            method: 'DELETE',
            data: { itemID },
            success: (data) => {
                const opt = $(document.createElement('option'));
                opt.attr('id', `addItemOption${itemID}`);
                opt.val(itemID);
                opt.text($(`#itemName${itemID}`).text());
                addItemList.append(opt);

                $(`#itemRow${itemID}`).remove();

                addItemButton.prop('disabled', false);
            },
            error: showFailureToastMessage
        });
}

function itemDescriptionChange(ev, itemID) {
    const description = $(ev.target).val();

    $.ajax('/sheet/player/item',
        {
            method: 'POST',
            data: { itemID, description },
            error: showFailureToastMessage
        })
}

function itemQuantityChange(ev, itemID) {
    const quantity = $(ev.target).val();

    $.ajax('/sheet/player/item',
        {
            method: 'POST',
            data: { itemID, quantity },
            error: showFailureToastMessage
        })
}

//Notes

function playerAnotationsChange(event) {
    const value = $(event.target).val();

    $.ajax('/sheet/player/note',
        {
            method: 'POST',
            data: { value },
            error: showFailureToastMessage
        });
}

//Class

function classChange(ev) {
    const classID = parseInt($(ev.target).val());
    const option = $(ev.target).find('option:selected');
    const title = option.attr('ability-title');
    const description = option.attr('ability-description') || '';
    const energyBonus = parseInt(option.attr('energy-bonus')) || 0;

    if (title) $('#playerClassTitle').text(title + ': ');
    else $('#playerClassTitle').text('');
    $('#playerClassDescription').text(description);
    $('#playerClass').attr('energy-bonus', energyBonus);

    setAttributeBarMinimum($('.progress-bar[name="Energia"]'));

    $.ajax('/sheet/player/class', {
        method: 'POST',
        data: { id: classID },
        error: showFailureToastMessage
    });
}

function setAttributeBarMinimum(bar) {
    if (bar.length === 0) return;

    const attrID = bar.attr('attribute-id');

    const desc = $(`#attributeDesc${attrID}`);
    const split = desc.text().split('/');

    const charValue = parseInt($(`#characteristic${bar.attr('characteristic-id')}`).val()) || 0;
    const skillValue = parseInt($(`#skill${bar.attr('skill-id')}`).val()) || 0;
    const evaluation = eval(bar.attr('operation').replace('{characteristic}', charValue)
        .replace('{skill}', skillValue));
    const energyBonus = bar.attr('name') === 'Energia' ?
        parseInt($('#playerClass').attr('energy-bonus')) || 0 : 0;
    const newMin = energyBonus + evaluation;
    const cur = parseInt(split[0]);
    const max = parseInt(split[1]);
    let newMax = max;
    if (newMax < newMin) newMax = newMin;
    let newCur = clamp(cur, 0, newMax);

    $.ajax('/sheet/player/attribute', {
        method: 'POST',
        data: { attributeID: attrID, minValue: newMin, value: newCur, maxValue: newMax },
        success: () => {
            desc.text(`${newCur}/${newMax}`);
            $(`#attributeMinimum${attrID}`).text(newMin);
            updateAttributeBar(newMin, newCur, newMax, bar);
        },
        error: showFailureToastMessage
    });
}