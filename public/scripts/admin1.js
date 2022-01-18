$('#adminAnotations').change(async ev => {
    const value = $(ev.target).val();
    try { await axios.post('/sheet/player/note', { value }) }
    catch (err) { showFailureToastMessage(err) }
});

$('#changeEnvironment').click(async ev => {
    const combat = $(ev.target).prop('checked');
    try { await axios.post('/portrait/environment', { combat }) }
    catch (err) { showFailureToastMessage(err) }
});

async function playerLineageChange(ev) {
    const lineageID = $(ev.target).val();
    const playerID = $(ev.target).parents('.acds-player-container').data('player-id');
    try { await axios.post('/sheet/player/lineage', { lineageID, playerID }) }
    catch (err) { showFailureToastMessage(err) }
}

async function onPlayerScoreChanged(ev) {
    let value = $(ev.target).val();
    if (value < 0) {
        value = 0;
        $(ev.target).val(value);
    }
    const playerID = $(ev.target).parents('.acds-player-container').data('player-id');
    try { await axios.post('/sheet/player/score', { value, playerID }) }
    catch (err) { showFailureToastMessage(err) }
}

socket.on('info changed', content => {
    const playerID = content.playerID;
    const infoID = content.infoID;
    const value = content.value;

    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-info[data-info-id="${infoID}"]`).text(value);
});

socket.on('attribute changed', content => {
    const playerID = content.playerID;
    const attrID = content.attributeID;
    const newValue = content.value;
    const newTotalValue = content.totalValue;

    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-attribute[data-attribute-id="${attrID}"]`).text(`${newValue}/${newTotalValue}`);
});

socket.on('spec changed', content => {
    const playerID = content.playerID;
    const specID = content.specID;
    const value = content.value;

    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-spec[data-spec-id="${specID}"]`).text(value);
});

socket.on('characteristic changed', content => {
    const playerID = content.playerID;
    const charID = content.charID;
    const value = content.value;

    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-characteristic[data-characteristic-id="${charID}"]`).text(value);
});

socket.on('equipment added', content => {
    const playerID = content.playerID;
    const equipmentID = content.equipmentID;
    const using = content.using;
    const name = content.name;
    const damage = content.damage;
    const range = content.range;
    const attacks = content.attacks;

    const row = $($('#equipmentRowTemplate').html());
    row.data('equipment-id', equipmentID);
    row.find('.using').addClass(using ? 'bi-check' : 'bi-x');
    row.find('.name').text(name);
    row.find('.damage').text(damage);
    row.find('.range').text(range);
    row.find('.attacks').text(attacks);

    $(`.acds-player-container[data-player-id="${playerID}"] .player-equipment-table`).append(row);
});

socket.on('equipment deleted', content => {
    const playerID = content.playerID;
    const equipmentID = content.equipmentID;
    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-equipment[data-equipment-id="${equipmentID}"]`).remove();
});

socket.on('equipment changed', content => {
    const playerID = content.playerID;
    const equipmentID = content.equipmentID;
    const using = content.using;

    $(`.acds-player-container[data-player-id="${playerID}"] 
    .player-equipment[data-equipment-id="${equipmentID}"] .using`).attr('class', using ? 'bi-check' : 'bi-x');
});

socket.on('item added', content => {
    const playerID = content.playerID;
    const itemID = content.itemID;
    const name = content.name;
    const description = content.description;

    const row = $($('#itemRowTemplate').html());
    row.data('item-id', itemID);
    row.find('.name.description').text(name).attr('title', description);

    $(`.acds-player-container[data-player-id="${playerID}"] .player-item-table`).append(row);
});

socket.on('item deleted', content => {
    const playerID = content.playerID;
    const itemID = content.itemID;
    $(`.acds-player-container[data-player-id="${playerID}"]
    .player-item[data-item-id="${itemID}"]`).remove();
});

socket.on('dice result', content => {
    const playerID = content.playerID;
    const playerName = $(`.acds-player-container[data-player-id="${playerID}"]
    .player-info[name="Nome"]`).text() || 'Desconhecido';

    const dices = content.dices.map(dice => {
        const n = dice.n;
        const roll = dice.roll;
        return n > 0 ? `${n}d${roll}` : roll;
    });

    const results = content.results.map(res => {
        const roll = res.roll;
        const successType = res.successType?.description;
        if (successType) return `${roll} (${successType})`;
        return roll;
    });

    const diceList = $('#diceList');
    const children = diceList.children();
    if (children.length > 10) children[children.length - 1].remove();

    const msg = $(`<li><span style='color:red;'>${playerName}</span>
    rolou
    <span style='color:lightgreen;'>${dices.join(', ')}</span> 
    e tirou 
    <span style='color:lightgreen;'>${results.join(', ')}</span>.</li>`);

    if (results.length > 1) msg.append(` Soma: 
    <span style='color:lightgreen;'>${results.reduce((a, b) => a + b, 0)}</span>.`)

    diceList.prepend(msg);
});

socket.on('class change', content => {
    const playerID = content.playerID;
    const className = content.className;

    const container = $(`.acds-player-container[data-player-id="${playerID}"`);
    container.find('.class-name').text(className);
})

socket.on('score change', content => {
    const playerID = content.playerID;
    const newScore = content.newScore;

    const container = $(`.acds-player-container[data-player-id="${playerID}"`);
    container.find('.player-score').val(newScore);
})