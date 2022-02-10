//Equipments
{
    const createEquipmentModal = new bootstrap.Modal($('#createEquipment')[0]);
    const createEquipmentContainer = $('#createEquipmentContainer');
    const createEquipmentButton = $('#createEquipmentButton');
    const createEquipmentCloseButton = $('#createEquipmentCloseButton');
    const equipmentLoading = createEquipmentContainer.find('.loading');

    $('#createEquipment').on('hidden.bs.modal', () => {
        createEquipmentButton.prop('disabled', false);
        createEquipmentCloseButton.prop('disabled', false);
        createEquipmentContainer.show();
        equipmentLoading.hide();
    });

    createEquipmentButton.click(async () => {
        const name = $('#createEquipmentName').val();
        const skillID = parseInt($('#combatSpecializationList').val());
        const type = $('#createEquipmentType').val();
        const damage = $('#createEquipmentDamage').val();
        const range = $('#createEquipmentRange').val();
        const attacks = $('#createEquipmentAttacks').val();
        const ammo = $('#createEquipmentAmmo').val();

        createEquipmentButton.prop('disabled', true);
        createEquipmentCloseButton.prop('disabled', true);
        createEquipmentContainer.hide();
        equipmentLoading.show();

        try {
            const response = await axios.put('/sheet/equipment', {
                name,
                type,
                skillID,
                damage,
                range,
                attacks,
                ammo,
                visible: false
            });
            const id = response.data.equipmentID;

            addEquipment({
                id,
                name,
                type,
                skillID,
                damage,
                range,
                attacks,
                ammo,
                visible: false
            });
        }
        catch (err) { showFailureToastMessage(err) }
        createEquipmentModal.hide();
    });
}

async function equipmentDeleteClick(ev) {
    if (!confirm("Você realmente quer remover esse equipamento?"))
        return;

    const row = $(ev.target).parents('tr');
    const equipmentID = row.data('equipment-id');

    try {
        await axios.delete('/sheet/equipment', { data: { equipmentID } });
        row.remove();
    }
    catch (err) { showFailureToastMessage(err) }
}

async function equipmentChange(ev) {
    const key = $(ev.target).data('key');
    const value = $(ev.target).val();
    const equipmentID = $(ev.target).parents('tr').data('equipment-id')
    const data = {};
    data[key] = value;
    data.equipmentID = equipmentID;
    try { await axios.post('/sheet/equipment', data) }
    catch (err) { showFailureToastMessage(err) }
}

async function equipmentVisibleChange(ev) {
    const value = $(ev.target).prop('checked');
    const equipmentID = $(ev.target).parents('tr').data('equipment-id')

    try { await axios.post('/sheet/equipment', { equipmentID, visible: value }) }
    catch (err) { showFailureToastMessage(err) }
}

//Skills
{
    const createSkillModal = new bootstrap.Modal($('#createSkill')[0]);
    const createSkillContainer = $('#createSkillContainer');
    const createSkillButton = $('#createSkillButton');
    const createSkillCloseButton = $('#createSkillCloseButton');

    const skillLoading = createSkillContainer.find('.loading');

    $('#createSkill').on('hidden.bs.modal', () => {
        createSkillButton.prop('disabled', false);
        createSkillCloseButton.prop('disabled', false);
        createSkillContainer.show();
        skillLoading.hide();
    });

    createSkillButton.click(async () => {
        createSkillContainer.hide();
        createSkillButton.prop('disabled', true);
        createSkillCloseButton.prop('disabled', true);
        skillLoading.show();

        const name = $('#createSkillName').val();
        const specializationID = parseInt($('#createSkillSpecialization').val());
        const characteristicID = parseInt($('#createSkillCharacteristic').val());

        try {
            const response = await axios.put('/sheet/skill', { name, specializationID, characteristicID });
            const id = response.data.skillID;
            addSkill({ id, name, specializationID, characteristicID, mandatory: false });
        }
        catch (err) { showFailureToastMessage(err) }
        createSkillModal.hide();
    });

}

async function skillDeleteClick(ev) {
    if (!confirm("Você realmente quer remover essa perícia?"))
        return;

    const row = $(ev.target).parents('tr');
    const skillID = row.data('skill-id');
    try {
        await axios.delete('/sheet/skill', { data: { skillID } });
        row.remove();
    }
    catch (err) { showFailureToastMessage(err) }
}

async function skillChange(ev) {
    const key = $(ev.target).data('key');
    const value = $(ev.target).val();
    const skillID = $(ev.target).parents('tr').data('skill-id');
    const data = {};
    data[key] = value;
    data.skillID = skillID;
    try { await axios.post('/sheet/skill', data) }
    catch (err) { showFailureToastMessage(err) }
}

async function skillMandatoryChange(ev, id) {
    const value = $(ev.target).prop('checked');
    const skillID = $(ev.target).parents('tr').data('skill-id');

    try { await axios.post('/sheet/skill', { skillID, mandatory: value }) }
    catch (err) { showFailureToastMessage(err) }
}

//Item
{
    const createItemModal = new bootstrap.Modal($('#createItem')[0]);
    const createItemContainer = $('#createItemContainer');
    const createItemButton = $('#createItemButton');
    const createItemCloseButton = $('#createItemCloseButton');

    const itemLoading = createItemContainer.find('.loading');

    $('#createItem').on('hidden.bs.modal', () => {
        createItemButton.prop('disabled', false);
        createItemCloseButton.prop('disabled', false);
        createItemContainer.show();
        itemLoading.hide();
    });

    createItemButton.click(async () => {
        createItemContainer.hide();
        createItemButton.prop('disabled', true);
        createItemCloseButton.prop('disabled', true);
        itemLoading.show();

        const name = $('#createItemName').val();
        const description = $('#createItemDescription').val();

        try {
            const response = await axios.put('/sheet/item', { name, description, visible: false });
            const id = response.data.itemID;
            addItem({ id, name, description, visible: false });
        }
        catch (err) { showFailureToastMessage(err) }
        createItemModal.hide();
    });
}

async function itemDeleteClick(ev) {
    if (!confirm("Você realmente quer remover esse item?"))
        return;

    const row = $(ev.target).parents('tr');
    const itemID = row.data('item-id');
    try {
        await axios.delete('/sheet/item', { data: { itemID } });
        row.remove();
    }
    catch (err) { showFailureToastMessage(err) }
}

async function itemChange(ev) {
    const key = $(ev.target).data('key');
    const value = $(ev.target).val();
    const itemID = $(ev.target).parents('tr').data('item-id');
    const data = {};
    data[key] = value;
    data.itemID = itemID;
    try { await axios.post('/sheet/item', data) }
    catch (err) { showFailureToastMessage(err) }
}

async function itemVisibleChange(ev) {
    const value = $(ev.target).prop('checked');
    const itemID = $(ev.target).parents('tr').data('item-id');
    try { await axios.post('/sheet/item', { itemID, visible: value }) }
    catch (err) { showFailureToastMessage(err) }
}

//Curses
{
    const createCurseModal = new bootstrap.Modal($('#createCurse')[0]);
    const createCurseContainer = $('#createCurseContainer');
    const createCurseButton = $('#createCurseButton');
    const createCurseCloseButton = $('#createCurseCloseButton');

    const curseLoading = createCurseContainer.find('.loading');

    $('#createCurse').on('hidden.bs.modal', () => {
        createCurseButton.prop('disabled', false);
        createCurseCloseButton.prop('disabled', false);
        createCurseContainer.show();
        curseLoading.hide();
    });

    createCurseButton.click(async () => {
        createCurseContainer.hide();
        createCurseButton.prop('disabled', true);
        createCurseCloseButton.prop('disabled', true);
        curseLoading.show();

        const name = $('#createCurseName').val();
        const description = $('#createCurseDescription').val();
        const level = $('#createCurseLevel').val();

        const focusDescriptions = createCurseContainer.find('.focus-description');
        const focuses = [];
        for (let i = 0; i < focusDescriptions.length; i++) {
            const focus = focusDescriptions.eq(i);
            const characteristicID = focus.data('characteristic-id');
            const description = focus.val();
            focuses.push({ characteristicID, description });
        }

        try {
            const response = await axios.put('/sheet/curse', { name, description, level, focuses });
            const id = response.data.curseID;
            addCurse({ id, name, description, level, visible: false });
        }
        catch (err) { showFailureToastMessage(err) }
        createCurseModal.hide();
    });
}

const editCurseModal = new bootstrap.Modal($('#editCurse')[0]);
const editCurseContainer = $('#editCurseContainer');
{
    const editCurseButton = $('#editCurseButton');
    const editCurseCloseButton = $('#editCurseCloseButton');

    const curseLoading = editCurseContainer.find('.loading');

    $('#editCurse').on('hidden.bs.modal', () => {
        editCurseButton.prop('disabled', false);
        editCurseCloseButton.prop('disabled', false);
        editCurseContainer.show();
        curseLoading.hide();
    });

    editCurseButton.click(async () => {
        editCurseContainer.hide();
        editCurseButton.prop('disabled', true);
        editCurseCloseButton.prop('disabled', true);
        curseLoading.show();

        const focusDescriptions = editCurseContainer.find('.focus-description');
        const focuses = [];
        for (let i = 0; i < focusDescriptions.length; i++) {
            const focus = focusDescriptions.eq(i);
            const characteristicID = focus.data('characteristic-id');
            const description = focus.val();
            focuses.push({ characteristicID, description });
        }

        try {
            const curseID = editCurseContainer.data('curse-id');
            await axios.post('/sheet/curse', { focuses, curseID });
        }
        catch (err) { showFailureToastMessage(err) }
        editCurseModal.hide();
    });

}
async function curseFocusUpdateClick(ev) {
    const curseID = $(ev.target).parents('tr').data('curse-id');

    try {
        const response = await axios.get('/sheet/curse/focus', { params: { curseID } });
        const focuses = response.data.focuses;
        const focusDescriptions = editCurseContainer.find('.focus-description');
        for (let i = 0; i < focusDescriptions.length; i++) {
            const focusDescription = focusDescriptions.eq(i);
            const charID = focusDescription.data('characteristic-id');
            const focus = focuses.find(el => el.characteristic_id === charID);
            focusDescription.val(focus.description);
        }
        editCurseModal.show();
        editCurseContainer.data('curse-id', curseID);
    }
    catch (err) { showFailureToastMessage(err) }
}

async function curseDeleteClick(ev) {
    if (!confirm("Você realmente quer remover essa maldição?"))
        return;

    const row = $(ev.target).parents('tr');
    const curseID = row.data('curse-id');
    try {
        await axios.delete('/sheet/curse', { data: { curseID } });
        row.remove();
    }
    catch (err) { showFailureToastMessage(err) }
}

async function curseChange(ev) {
    const key = $(ev.target).data('key');
    const value = $(ev.target).val();
    const curseID = $(ev.target).parents('tr').data('curse-id');
    const data = {};
    data[key] = value;
    data.curseID = curseID;
    try { await axios.post('/sheet/curse', data) }
    catch (err) { showFailureToastMessage(err) }
}

async function curseVisibleChange(ev) {
    const value = $(ev.target).prop('checked');
    const curseID = $(ev.target).parents('tr').data('curse-id');
    try { await axios.post('/sheet/curse', { curseID, visible: value }) }
    catch (err) { showFailureToastMessage(err) }
}

function addEquipment(equipment) {
    const row = $($('#equipmentRowTemplate').html());
    row.data('equipment-id', equipment.id);
    row.find('.name').val(equipment.name);
    row.find('.specialization').val(equipment.skillID);
    row.find('.type').val(equipment.type);
    row.find('.damage').val(equipment.damage);
    row.find('.range').val(equipment.range);
    row.find('.attacks').val(equipment.attacks);
    row.find('.ammo').val(equipment.ammo);
    row.find('.visible').prop('checked', equipment.visible);

    $('#equipmentListTable').append(row);
}

function addSkill(skill) {
    const row = $($('#skillRowTemplate').html());
    row.data('skill-id', skill.id);
    row.find('.name').val(skill.name);
    row.find('.specialization').val(skill.specializationID);
    row.find('.characteristic').val(skill.characteristicID);
    row.find('.mandatory').prop('checked', skill.mandatory);

    $('#skillListTable').append(row);
}

function addItem(item) {
    const row = $($('#itemRowTemplate').html());
    row.data('item-id', item.id);
    row.find('.name').val(item.name);
    row.find('.description').val(item.description);
    row.find('.visible').prop('checked', item.visible);

    $('#itemListTable').append(row);
}

function addCurse(curse) {
    const row = $($('#curseRowTemplate').html());
    row.data('curse-id', curse.id);
    row.find('.name').val(curse.name);
    row.find('.description').val(curse.description);
    row.find('.level').val(curse.level);
    row.find('.visible').prop('checked', curse.visible);
    $('#curseListTable').append(row);
}