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
    const lineageID = parseInt($(ev.target).val());
    const playerID = $(ev.target).parents('.acds-player-container').data('player-id');
    try {
        await axios.post('/sheet/player/lineage', { lineageID, playerID });
        const img = $(`.acds-player-container[data-player-id="${playerID}"] .avatar-container .lineage`);
        img.data('lineage', lineageID).attr('src', lineageID ? `/assets/lineages/frameless/${lineageID}/1.png` : '');
    }
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

{
    const list = $('#initiativeList');
    let currentIndex = -1;
    const players = $('.acds-player-container');
    for (let i = 0; i < players.length; i++) {
        const player = players.eq(i);
        list.append($(`<li>${player.find('.player-info[name="Nome"]').text()}</li>`));
    }
    Sortable.create(list[0], { animation: 150 });

    $('.initiative-button').click(ev => {
        const children = list.children();
        if (children.length < 2) {
            return;
        }

        const coef = $(ev.target).data('coef');
        currentIndex += coef;
        let previousIndex = currentIndex - 1;
        let nextIndex = currentIndex + 1;

        if (currentIndex < 0) {
            currentIndex = children.length - 1;
            previousIndex = 0;
        }
        else if (currentIndex >= children.length) {
            currentIndex = 0;
            nextIndex = children.length - 1;
        }

        const child = children.eq(currentIndex);
        child.addClass('active');
        const upChild = children.eq(previousIndex);
        upChild.removeClass('active');
        const downChild = children.eq(nextIndex);
        downChild.removeClass('active');
    });

    $('.initiative-clear-button').click(ev => {
        list.find('li.active').removeClass('active');
        list.find('li.enemy').remove();
        $('.round').val(1);
        currentIndex = -1;
    });

    $('#addEnemy').click(ev => {
        const input = $(`<input class="name acds-element acds-bottom-text text-center" 
        value="Inimigo ${list.children().length}"></input>`);
        const btn = $(`<button class="ms-1 btn btn-secondary btn-sm">-</button>`);
        btn.click(enemyRemove);
        const li = $('<li class="enemy"></li>').append(input, btn);
        list.append(li);
    });

    function enemyRemove(ev) {
        $(ev.target).parent().remove();
        if (currentIndex > -1) {
            list.children().eq(currentIndex).addClass('active');
        }
    }
}


$('#addNPC').click(ev => {
    const list = $('#npcList');
    list.append($(`<li>
        <input class="name acds-element acds-bottom-text" value="NPC ${list.children().length}"></input>
        <input type="number" class="health acds-element acds-bottom-text" value="0"></input>
        <button class="btn btn-secondary btn-sm" onclick="$(event.target).parent().remove()">-</button>
    </li>`));
});

{
    const fastDiceModal = new bootstrap.Modal($('#fastDiceRoll')[0]);
    $('#fastDiceRoll').on('hidden.bs.modal', () => $('#fastDiceRollValue').val(1));
    
    $('#fastDiceRollButton').click(ev => {
        fastDiceModal.hide();
        const value = parseInt($('#fastDiceRollValue').val()) || 1;
        rollDice(value);
    });
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

socket.on('attribute status changed', content => {
    const container = $(`.acds-player-container[data-player-id="${content.playerID}"]`);
    const array = container.data('attribute-status');

    const updatedAttrStatus = array.find(attr => attr.attribute_status_id === content.attrStatusID);
    updatedAttrStatus.value = content.value;
    container.data('attribute-status', array);

    for (const attr of array)
        if (attr.value) return showAvatar(container, attr.attribute_status_id);
    showAvatar(container);
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
    const quantity = content.quantity;

    const row = $($('#itemRowTemplate').html());
    row.data('item-id', itemID);
    row.find('.name.description').text(name).attr('title', `${description} (${quantity})`);

    $(`.acds-player-container[data-player-id="${playerID}"] .player-item-table`).append(row);
});

socket.on('item deleted', content => {
    const playerID = content.playerID;
    const itemID = content.itemID;
    $(`.acds-player-container[data-player-id="${playerID}"]
    .player-item[data-item-id="${itemID}"]`).remove();
});

socket.on('item changed', content => {
    const playerID = content.playerID;
    const itemID = content.itemID;
    const description = content.description;
    const quantity = content.quantity;

    $(`.acds-player-container[data-player-id="${playerID}"]
    .player-item[data-item-id="${itemID}"]`).attr('title', `${description} (${quantity})`);
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

    const wrapper = $('.table-wrapper.dice-wrapper');
    const diceList = $('#diceList');
    const children = diceList.children();
    if (children.length > 6) children[0].remove();

    const msg = $(`<li><span style='color:red;'>${playerName}</span>
    rolou
    <span style='color:lightgreen;'>${dices.join(', ')}</span> 
    e tirou 
    <span style='color:lightgreen;'>${results.join(', ')}</span>.</li>`);

    if (results.length > 1) msg.append(` Soma: 
    <span style='color:lightgreen;'>${results.reduce((a, b) => a + b, 0)}</span>.`)

    diceList.append(msg);
    wrapper.scrollTop(wrapper[0].scrollHeight);
});

socket.on('class change', content => {
    const playerID = content.playerID;
    const className = content.className;

    const container = $(`.acds-player-container[data-player-id="${playerID}"`);
    container.find('.class-name').text(className);
})

socket.on('lineage node change', content => {
    const newIndex = content.index;
    const newLevel = content.level;
    const playerID = content.playerID;
    const newScore = content.newScore;

    const container = $(`.acds-player-container[data-player-id="${playerID}"`);
    container.find('.player-score').val(newScore);

    const img = container.find('.avatar-container .lineage');

    const lineageID = img.data('lineage');
    const oldLevel = img.data('level');

    if (newLevel >= oldLevel) {
        img.attr('src', `/assets/lineages/frameless/${lineageID}/${newIndex}.png`);
        img.data('level', newLevel);
    }
});

function showAvatar(container, attrStatusID = 0) {
    const avatarImage = container.find('.avatar');
    const playerID = container.data('player-id');
    avatarImage.removeClass('dying weakening unconscious');
    switch (attrStatusID) {
        case 1:
            //Morrendo
            attrStatusID = 0;
            avatarImage.addClass('dying');
            break;
        case 2:
            //Enfraquecendo
            attrStatusID = 0;
            avatarImage.addClass('weakening');
            break;
        case 3:
            //Inconsciente
            attrStatusID = 0;
            avatarImage.addClass('unconscious');
            break;
    }
    avatarImage.attr('src', `/avatar/${attrStatusID}?playerID=${playerID}&v=${Date.now()}`);
}

{
    const containers = $('.acds-player-container');
    for (let i = 0; i < containers.length; i++) {
        const container = containers.eq(i);
        const attr = container.data('attribute-status').find(attr => attr.value === 1);
        showAvatar(container, attr?.attribute_status_id || 0);
    }
}