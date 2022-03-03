function resolveAttributeBar(container, { newCur, newMax, newExtra }) {
    const bar = container.find('.progress-bar');

    if (newMax === undefined) newMax = bar.data('max');
    bar.data('max', newMax);

    if (newExtra === undefined) newExtra = bar.data('extra');
    bar.data('extra', newExtra);

    const newTotal = newMax + newExtra;

    if (newCur === undefined) newCur = bar.data('current');
    newCur = global.clamp(newCur, 0, newTotal);
    bar.data('current', newCur);

    container.find('.attribute-description').text(`${newCur}/${newTotal}`);
    bar.data('total', newTotal);
    bar.css('width', `${((newCur / newTotal) * 100) || 0}%`);
}

//Info
{
    $('.info-container input.info-field').focusout(infoFocusOut);
    $('.info-container label.info-field').click(infoClick);

    let initialValue = '';

    function infoClick(ev) {
        if (global.getClickCount(ev) < 2) return;

        const forLabel = $(ev.target).attr('for');
        const value = $(ev.target).text();

        const input = $(`<input class="acds-element acds-bottom-text info-field" type="text" id="${forLabel}"
        value="${value}" autocomplete="off"></input>`);

        $(ev.target).parent().empty().append(input).unbind().focusout(infoFocusOut);
        input.focus()[0].selectionStart = value.length;
        initialValue = value;
    }

    async function infoFocusOut(ev) {
        const value = $(ev.target).val();

        if (initialValue !== value) {
            const infoID = $(ev.target).parents('.info-container').data('info-id');

            try { await axios.post('/sheet/player/info', { infoID, value }) }
            catch (err) { showFailureToastMessage(err) }
        }

        if (!value) return;

        const forID = $(ev.target).attr('id');
        const label = $(`<label class="info-field" for="${forID}">${value}</label>`);
        $(ev.target).parent().empty().append(label).unbind().click(infoClick);
    }
}

//Class
$("#playerClassSelect").change(async ev => {
    const option = $(ev.target).find('option:selected');
    const title = option.data('ability-title');
    const description = option.data('ability-description') || '';
    $('#playerClassTitle').text(title ? title + ': ' : '');
    $('#playerClassDescription').text(description);

    try {
        const classID = parseInt($(ev.target).val());
        const response = await axios.post('/sheet/player/class', { classID });
        updateSkills(response.data.updatedSkills);
        updateAttributes(response.data.updatedAttributes);
    }
    catch (err) {
        showFailureToastMessage(err);
    }
});

//Avatar
{
    const uploadAvatarModal = new bootstrap.Modal($('#uploadAvatar')[0]);
    const uploadAvatarContainer = $('#uploadAvatarContainer');
    const uploadAvatarButton = $('#uploadAvatarButton');
    const uploadAvatarCloseButton = $('#uploadAvatarCloseButton');

    const loading = uploadAvatarContainer.find('.loading');

    $('#uploadAvatar').on('hidden.bs.modal', () => {
        uploadAvatarButton.prop('disabled', false);
        uploadAvatarCloseButton.prop('disabled', false);
        uploadAvatarContainer.show();
        loading.hide();
    });

    uploadAvatarButton.click(async () => {
        uploadAvatarButton.prop('disabled', true);
        uploadAvatarCloseButton.prop('disabled', true);
        uploadAvatarContainer.hide();
        loading.show();

        const avatars = $('.avatar-field').map((i, el) => {
            const avatar = $(el);
            let id = avatar.data('avatar-id') || null;
            return { attribute_status_id: id, link: avatar.val() };
        }).get();

        try {
            await axios.post('/avatar', { avatars });
            findAvatar();
        }
        catch (err) { showFailureToastMessage(err) }
        uploadAvatarModal.hide();
    });
}
function findAvatar() {
    const avatarImage = $('#avatar');
    const field = $('.attribute-status-container input:checked').first();
    let id = field.length === 0 ? 0 : field.parents('.attribute-status-container').data('attribute-status-id');

    avatarImage.removeClass('unconscious');
    switch (id) {
        case 1:
            id = 0;
            avatarImage.addClass('unconscious');
            break;
        case 2:
            id = 0;
            avatarImage.addClass('unconscious');
            break;
        case 3:
            id = 0;
            avatarImage.addClass('unconscious');
            break;
    }
    avatarImage.attr('src', `/avatar/${id}?v=${Date.now()}`);
}
findAvatar();

//Attributes
{
    const attributeContainer = $('.attribute-container');

    attributeContainer.find('.attribute-max').change(async ev => {
        const container = $(ev.target).parents('.attribute-container');
        const bar = container.find('.progress-bar');
        const attributeID = container.data('attribute-id');

        const cur = bar.data('current');
        const max = bar.data('max');
        const extra = bar.data('extra');

        const newMax = parseInt($(ev.target).val()) || 0;
        $(ev.target).val(newMax);

        if (newMax === max) return;

        const newCur = global.clamp(cur, 0, newMax + extra);

        try {
            await axios.post('/sheet/player/attribute', { attributeID, value: newCur, maxValue: newMax });
            resolveAttributeBar(container, { newCur, newMax });
        }
        catch (err) {
            showFailureToastMessage(err);
        }
    });

    attributeContainer.find('.progress').click(async ev => {
        const container = $(ev.target).parents('.attribute-container');
        const attributeID = container.data('attribute-id');
        const bar = container.find('.progress-bar');

        const cur = bar.data('current');
        const total = bar.data('total');
        const newValue = parseInt(prompt('Digite o novo valor do atributo:', cur));

        if (!newValue) return;

        const newCur = global.clamp(newValue, 0, total);

        if (newCur === cur) return;

        try {
            await axios.post('/sheet/player/attribute', { attributeID, value: newCur });
            resolveAttributeBar(container, { newCur });
        }
        catch (err) {
            showFailureToastMessage(err);
        }
    });

    attributeContainer.find('.dice').click(ev =>
        rollDice(parseInt($('.spec-container input[name="Exposição Pavorosa"]').val()), 100, false));
}

//Attribute Status
$('.attribute-status-container input').change(async ev => {
    const checked = $(ev.target).prop('checked');
    const attributeStatusID = $(ev.target).parents('.attribute-status-container').data('attribute-status-id');
    findAvatar();
    try {
        await axios.post('/sheet/player/attributestatus', { attributeStatusID, checked });
    }
    catch (err) {
        showFailureToastMessage(err);
    }
});

//Specs
$('.spec-container input').change(async ev => {
    const value = $(ev.target).val() || 0;
    $(ev.target).val(value);
    const specID = $(ev.target).parents('.spec-container').data('spec-id');
    try {
        await axios.post('/sheet/player/spec', { specID, value });
    }
    catch (err) {
        showFailureToastMessage(err);
    }
});

//Characteristics
{
    const containers = $('.characteristic-container');
    containers.find('input').change(async ev => {
        const lastValue = $(ev.target).data('last-value');
        const value = parseInt($(ev.target).val()) || 0;
        $(ev.target).val(value);
        if (lastValue === value) return;
        $(ev.target).data('last-value', value);
        const characteristicID = $(ev.target).parents('.characteristic-container').data('characteristic-id');

        try {
            const response = await axios.post('/sheet/player/characteristic', { characteristicID, value });
            updateSkills(response.data.updatedSkills);
            updateAttributes(response.data.updatedAttributes);
        }
        catch (err) {
            showFailureToastMessage(err);
        }
    });

    containers.find('img').click(ev => {
        const value = $(ev.target).parents('.characteristic-container').find('input').val();
        rollDice(parseInt(value) || 0);
    });
}

//Equipments
const addEquipmentList = $('#addEquipmentList');
const addEquipmentButton = $('#addEquipmentButton');
{
    const addEquipmentModal = new bootstrap.Modal($('#addEquipment')[0]);
    const createEquipmentModal = new bootstrap.Modal($('#createEquipment')[0]);

    const equipmentTable = $('#equipmentTable');

    const addEquipmentContainer = $('#addEquipmentContainer');
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
    const addLoading = addEquipmentContainer.find('.loading');
    const createLoading = createEquipmentContainer.find('.loading');
    const equipmentRowTemplate = $('#equipmentRowTemplate').html();

    $('#createEquipment').on('hidden.bs.modal', () => {
        createEquipmentButton.prop('disabled', false);
        createEquipmentCloseButton.prop('disabled', false);
        createEquipmentContainer.show();
        createLoading.hide();
    });

    $('#addEquipment').on('hidden.bs.modal', () => {
        addEquipmentCloseButton.prop('disabled', false);
        addEquipmentCreate.prop('disabled', false);
        addEquipmentContainer.show();
        addLoading.hide();
    });

    addEquipmentButton.click(async ev => {
        addEquipmentButton.prop('disabled', true);
        addEquipmentCloseButton.prop('disabled', true);
        addEquipmentCreate.prop('disabled', true);
        addEquipmentContainer.hide();
        addLoading.show();

        const equipmentID = addEquipmentList.val();

        try {
            const response = await axios.put('/sheet/player/equipment', { equipmentID });
            const equipment = response.data.equipment;

            const newRow = $(equipmentRowTemplate);
            newRow.data('equipment-id', equipmentID);
            newRow.find('.using').prop('checked', equipment.using);
            newRow.find('.name').text(equipment.name)
            newRow.find('.skill-name').text(equipment.skill_name);
            newRow.find('.type').text(equipment.type);
            newRow.find('.damage').text(equipment.damage);
            newRow.find('.range').text(equipment.range);
            newRow.find('.attacks').text(equipment.attacks);
            newRow.find('.current-ammo').val(equipment.current_ammo);
            newRow.find('.max-ammo').text(equipment.ammo);

            addEquipmentList.find(`option[value="${equipmentID}"]`).remove();
            addEquipmentButton.prop('disabled', addEquipmentList.children().length === 0);
            equipmentTable.append(newRow);
        }
        catch (err) {
            showFailureToastMessage(err);
        }
        addEquipmentModal.hide();
    });

    createEquipmentButton.click(async ev => {
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
        createLoading.show();

        try {
            const response = await axios.put('/sheet/equipment', {
                name,
                skillID,
                type,
                damage,
                range,
                attacks,
                ammo,
                visible: true
            });
            const id = response.data.equipmentID;
            const opt = $(`<option value="${id}">${name}</option>`);
            addEquipmentList.append(opt);
            addEquipmentButton.prop('disabled', false);
        }
        catch (err) {
            showFailureToastMessage(err);
        }
        createEquipmentModal.hide();
    });

    socket.on('equipment added', content => {
        const equipmentID = content.equipmentID;
        const name = content.name;
        if (equipmentTable.find('tr').filter((i, el) => $(el).data('equipment-id') === equipmentID).length > 0 ||
            addEquipmentList.find(`option[value="${equipmentID}"]`).length > 0) return;

        const opt = $(`<option value="${equipmentID}">${name}</option>`);
        addEquipmentList.append(opt);
        addEquipmentButton.prop('disabled', false);
    });

    socket.on('equipment removed', content => {
        const equipmentID = content.equipmentID;
        addEquipmentList.find(`option[value="${equipmentID}"]`).remove();
        addEquipmentButton.prop('disabled', addEquipmentList.children().length === 0);
    });

    socket.on('equipment changed', content => {
        const equipmentID = content.equipmentID;
        const name = content.name;
        const skill_name = content.skill_name;
        const type = content.type;
        const damage = content.damage;
        const range = content.range;
        const attacks = content.attacks;
        const ammo = content.ammo;

        const row = equipmentTable.find('tr').filter((i, el) => $(el).data('equipment-id') === equipmentID);
        if (row.length > 0) {
            if (name) row.find('.name').text(name);
            if (skill_name) row.find('.skill-name').text(skill_name);
            if (type) row.find('.type').text(type);
            if (damage) row.find('.damage').text(damage);
            if (range) row.find('.range').text(range);
            if (attacks) row.find('.attacks').text(attacks);
            if (ammo) row.find('.max-ammo').text(ammo);
        }
        else {
            const opt = addEquipmentList.find(`option[value="${equipmentID}"]`);
            if (name) opt.text(name);
        }
    });
}

async function deleteEquipmentClick(ev) {
    if (!confirm("Você realmente quer remover esse equipamento?"))
        return;

    const row = $(ev.target).parents('tr');
    const equipmentID = row.data('equipment-id');
    const equipName = row.find('.name').text();

    try {
        await axios.delete('/sheet/player/equipment', { data: { equipmentID } });
        if (addEquipmentList.find(`option[value="${equipmentID}"]`).length === 0)
            addEquipmentList.append($(`<option value="${equipmentID}">${equipName}</option>`));
        row.remove();
        addEquipmentButton.prop('disabled', false);
    }
    catch (err) {
        showFailureToastMessage(err);
    }
}

async function equipmentUsingChange(ev) {
    const using = $(ev.target).prop('checked');
    const equipmentID = $(ev.target).parents('tr').data('equipment-id');
    try { await axios.post('/sheet/player/equipment', { equipmentID, using }) }
    catch (err) { showFailureToastMessage(err) }
}

async function equipmentAmmoChange(ev) {
    const $currentAmmo = $(ev.target);
    const value = parseInt($currentAmmo.val()) || 0;
    const row = $currentAmmo.parents('tr');
    const equipmentID = row.data('equipment-id');
    const maxAmmo = parseInt(row.find('.max-ammo').text());

    if (isNaN(maxAmmo)) {
        $currentAmmo.val('-');
        return alert('Esse equipamento não possui munição.');
    }
    if (value > maxAmmo) {
        $currentAmmo.val(maxAmmo);
        return alert('Você não pode ter mais munição do que a capacidade do equipamento.');
    }

    $currentAmmo.val(value);

    try { await axios.post('/sheet/player/equipment', { equipmentID, currentAmmo: value }) }
    catch (err) { showFailureToastMessage(err) }
}

async function equipmentDiceClick(ev) {
    const row = $(ev.target).parents('tr');
    const using = row.find('.using').prop('checked');

    if (!using) return alert('Você não está usando esse equipamento.');

    const ammoTxt = row.find('.current-ammo');
    let curAmmo = parseInt(ammoTxt.val());
    const maxAmmo = parseInt(row.find('.max-ammo').text());

    if (!isNaN(maxAmmo) && (isNaN(curAmmo) || curAmmo <= 0))
        return alert('Você não tem munição para isso.');

    const dices = resolveDices(row.find('.damage').text());

    if (!dices) return;

    if (!isNaN(curAmmo)) {
        ammoTxt.val(--curAmmo);
        try { await axios.post('/sheet/player/equipment', { equipmentID: row.data('equipment-id'), currentAmmo: curAmmo }) }
        catch (err) { showFailureToastMessage(err) }
    }

    rollDices(dices);
}

//Skills
const addSkillButton = $('#addSkillButton');
const addSkillList = $('#addSkillList');
{
    const addSkillModal = new bootstrap.Modal($('#addSkill')[0]);
    const createSkillModal = new bootstrap.Modal($('#createSkill')[0]);

    const skillTable = $('#skillTable');

    const skillsContainer = $('.skill-container');

    const addSkillContainer = $('#addSkillContainer');
    const addSkillCloseButton = $('#addSkillCloseButton');
    const addSkillCreateButton = $('#addSkillCreateButton');

    const createSkillContainer = $('#createSkillContainer');
    const createSkillButton = $('#createSkillButton');
    const createSkillCloseButton = $('#createSkillCloseButton');
    const createSkillName = $('#createSkillName');
    const createSkillCharacteristic = $('#createSkillCharacteristic');
    const createSkillSpecialization = $('#createSkillSpecialization');

    const addLoading = addSkillContainer.find('.loading');
    const createLoading = createSkillContainer.find('.loading');

    const skillContainerTemplate = $('#skillContainerTemplate').html();

    $('#createSkill').on('hidden.bs.modal', () => {
        createSkillButton.prop('disabled', false);
        createSkillCloseButton.prop('disabled', false);
        createSkillContainer.show();
        createLoading.hide();
    });

    $('#addSkill').on('hidden.bs.modal', () => {
        addSkillContainer.show();
        addSkillCreateButton.prop('disabled', false);
        addSkillCloseButton.prop('disabled', false);
        addLoading.hide();
    });

    createSkillButton.click(async () => {
        createSkillContainer.hide();
        createLoading.show();
        createSkillButton.prop('disabled', true);
        createSkillCloseButton.prop('disabled', true);
        const specializationID = createSkillSpecialization.val();
        const characteristicID = createSkillCharacteristic.val();
        const name = createSkillName.val();
        try {
            const response = await axios.put('/sheet/skill', { name, specializationID, characteristicID });
            const id = response.data.skillID;
            addSkillList.append($(`<option value="${id}">${name}</option>`));
            addSkillButton.prop('disabled', false);
        }
        catch (err) {
            showFailureToastMessage(err);
        }
        createSkillModal.hide();
    });

    addSkillButton.click(async () => {
        addSkillContainer.hide();
        addSkillButton.prop('disabled', true);
        addSkillCloseButton.prop('disabled', true);
        addSkillCreateButton.prop('disabled', true);
        addLoading.show();

        const skillID = addSkillList.val();

        try {
            const response = await axios.put('/sheet/player/skill', { skillID });
            const skill = response.data.skill;

            const container = $(skillContainerTemplate);
            container.data('skill-id', skill.skill_id);
            container.find('input').val(skill.value).data('last-value', skill.value);
            container.find('.total').text(skill.value);
            container.find('.name').text(skill.name);

            skillTable.append(container);

            addSkillList.find(`option[value="${skillID}"]`).remove();
        }
        catch (err) {
            showFailureToastMessage(err);
        }
        addSkillButton.prop('disabled', addSkillList.children().length === 0);
        addSkillModal.hide();
    });

    $('#skillSearch').on('input', ev => {
        const searchBar = $(ev.target);

        if (searchBar.val() === '') {
            skillsContainer.removeClass('d-none');
            return;
        }

        const str = searchBar.val().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        for (let i = 0; i < skillsContainer.length; i++) {
            const container = skillsContainer.eq(i);
            const name = container.find('.name').text().toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            container.toggleClass('d-none', !name.includes(str));
        }
    });

    socket.on('skill changed', content => {
        const skillID = content.skillID;
        const name = content.name;
        const element = $(`.skill-container[data-skill-id="${skillID}"] .name`);
        if (element.length > 0 && name) element.text(name);
    });
}

async function skillChange(ev) {
    const lastValue = $(ev.target).data('last-value');
    const value = parseInt($(ev.target).val()) || 0;
    $(ev.target).val(value);
    if (lastValue === value) return;
    $(ev.target).data('last-value', value);
    const container = $(ev.target).parents('.skill-container');
    const skillID = container.data('skill-id');

    try {
        const response = await axios.post('/sheet/player/skill', { skillID, value });
        const extra = container.data('extra');
        container.find('.total').text(value + extra);
        updateAttributes(response.data.updatedAttributes);
    }
    catch (err) {
        showFailureToastMessage(err);
    }
}

function skillDiceClick(ev) {
    rollDice(parseInt($(ev.target).parents('.skill-container').find('skill-total').text()));
}

//Items
const addItemButton = $('#addItemButton');
const addItemList = $('#addItemList');
{
    const addItemModal = new bootstrap.Modal($('#addItem')[0]);
    const createItemModal = new bootstrap.Modal($('#createItem')[0]);

    const itemTable = $('#itemTable');

    const addItemContainer = $('#addItemContainer');
    const addItemCloseButton = $('#addItemCloseButton');
    const addItemCreateButton = $('#addItemCreateButton');

    const createItemContainer = $('#createItemContainer');
    const createItemButton = $('#createItemButton');
    const createItemCloseButton = $('#createItemCloseButton');
    const createItemName = $('#createItemName');
    const createItemDescription = $('#createItemDescription');

    const addLoading = addItemContainer.find('.loading');
    const createLoading = createItemContainer.find('.loading');

    const itemRowTemplate = $('#itemRowTemplate').html();

    $('#createItem').on('hidden.bs.modal', () => {
        createItemButton.prop('disabled', false);
        createItemCloseButton.prop('disabled', false);
        createItemContainer.show();
        createLoading.hide();
    });

    $('#addItem').on('hidden.bs.modal', () => {
        addItemContainer.show();
        addItemCreateButton.prop('disabled', false);
        addItemCloseButton.prop('disabled', false);
        addLoading.hide();
    });

    addItemButton.click(async () => {
        addItemContainer.hide();
        addItemButton.prop('disabled', true);
        addItemCloseButton.prop('disabled', true);
        addItemCreateButton.prop('disabled', true);
        addLoading.show();

        const itemID = parseInt(addItemList.val());

        try {
            const response = await axios.put('/sheet/player/item', { itemID });
            const item = response.data.item;

            const newRow = $(itemRowTemplate);
            newRow.data('item-id', itemID);
            newRow.find('.name').text(item.name);
            newRow.find('.description').val(item.description);
            newRow.find('.quantity').val(item.quantity);
            itemTable.append(newRow);

            addItemList.find(`option[value="${itemID}"]`).remove();
            addItemButton.prop('disabled', addItemList.children().length === 0);
        }
        catch (err) { showFailureToastMessage(err) }
        addItemModal.hide();
    });

    createItemButton.click(async () => {
        createItemContainer.hide();
        createItemButton.prop('disabled', true);
        createItemCloseButton.prop('disabled', true);
        createLoading.show();

        const name = createItemName.val();
        const description = createItemDescription.val();

        try {
            const response = await axios.put('/sheet/item', { name, description, visible: true });
            const id = response.data.itemID;
            addItemList.append(`<option value="${id}">${name}</option>`);
            addItemButton.prop('disabled', false);
        }
        catch (err) { showFailureToastMessage(err) }
        createItemModal.hide();
    });

    socket.on('item added', content => {
        const itemID = content.itemID;
        const name = content.name;
        if (itemTable.find('tr').filter((i, el) => $(el).data('item-id') === itemID).length > 0 ||
            addItemList.find(`option[value="${itemID}"]`).length > 0) return;

        const opt = $(`<option value="${itemID}">${name}</option>`);
        addItemList.append(opt);
        addItemButton.prop('disabled', false);
    });

    socket.on('item removed', content => {
        const itemID = content.itemID;
        addItemList.find(`option[value="${itemID}"]`).remove();
        addItemButton.prop('disabled', addItemList.children().length === 0);
    });

    socket.on('item changed', content => {
        const itemID = content.itemID;
        const name = content.name;

        const row = itemTable.find('tr').filter((i, el) => $(el).data('item-id') === itemID);
        if (row.length > 0) {
            if (name) row.find('.name').text(name);
        }
        else {
            const opt = addItemList.find(`option[value="${itemID}"]`);
            if (name) opt.text(name);
        }
    });
}

async function deleteItemClick(ev) {
    if (!confirm("Você realmente quer remover esse equipamento?"))
        return;
    const row = $(ev.target).parents('tr');
    const itemID = row.data('item-id');
    try {
        await axios.delete('/sheet/player/item', { data: { itemID } });
        if (addItemList.find(`option[value="${itemID}"]`).length === 0)
            addItemList.append($(`<option value="${itemID}">${row.find('.name').text()}</option>`));
        row.remove();
        addItemButton.prop('disabled', false);
    }
    catch (err) { showFailureToastMessage(err) }
}

async function itemDescriptionChange(ev) {
    const itemID = $(ev.target).parents('tr').data('item-id');
    const description = $(ev.target).val();
    try { await axios.post('/sheet/player/item', { itemID, description }) }
    catch (err) { showFailureToastMessage(err) }
}

async function itemQuantityChange(ev) {
    const itemID = $(ev.target).parents('tr').data('item-id');
    const quantity = parseInt($(ev.target).val()) || 0;
    $(ev.target).val(quantity);
    try { await axios.post('/sheet/player/item', { itemID, quantity }) }
    catch (err) { showFailureToastMessage(err) }
}

//Extra Info
$('.extra-info-container textarea').change(async ev => {
    const extraInfoID = $(ev.target).parents('.extra-info-container').data('extra-info-id');
    const value = $(ev.target).val();
    try { await axios.post('/sheet/player/extrainfo', { extraInfoID, value }) }
    catch (err) { showFailureToastMessage(err) }
});

//Notes
$('#playerAnotations').change(async ev => {
    const value = $(ev.target).val();
    try { await axios.post('/sheet/player/note', { value }) }
    catch (err) { showFailureToastMessage(err) }
});

function updateSkills(skillsToUpdate) {
    for (const skill of skillsToUpdate) {
        const container = $(`.skill-container[data-skill-id="${skill.skillID}"]`);
        container.data('extra', skill.extraValue)
        container.find('.total').text(skill.totalValue);
    }
}

function updateAttributes(attributesToUpdate) {
    for (const attribute of attributesToUpdate) {
        const container = $(`.attribute-container[data-attribute-id="${attribute.attributeID}"]`);
        resolveAttributeBar(container, { newExtra: attribute.extraValue });
    }
}