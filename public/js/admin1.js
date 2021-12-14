const diceResultContent = $('#diceResultContent');
diceResultContent.hide();
const diceResultDescription = $('#diceResultDescription');
diceResultDescription.hide();
const loading = $('.loading');

const generalDiceModal = new bootstrap.Modal($('#generalDiceRoll')[0]);
const diceRollModal = new bootstrap.Modal($('#diceRoll')[0]);

const failureToast = new bootstrap.Toast($('#failureToast')[0], { delay: 4000 });
const failureToastBody = $('#failureToast > .toast-body');

$('#generalDiceRoll').on('hidden.bs.modal', ev => $('.general-dice-roll').text('0'));

//General
function showFailureToastMessage(err) {
    console.error(err);
    failureToastBody.text(`Erro ao tentar aplicar mudança - ${err.text}`);
    failureToast.show();
}

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

function rollDices(dices) {
    loading.show();
    diceRollModal.show();
    $.ajax('/dice', {
        data: { dices },
        success: data => {
            let results = data.results.map(res => res.roll);
            let sum = results.reduce((a, b) => a + b);
            loading.hide();
            diceResultContent.text(sum).fadeIn('slow', () => {
                if (results.length <= 1)
                    return;
                diceResultDescription.text(results.join(' + '))
                    .fadeIn('slow');
            });
        },
        error: showFailureToastMessage
    });
}

function resolveDices(str) {
    let dices = str.replace(/\s+/g, '').toLowerCase().split('+');
    let arr = [];
    for (let i = 0; i < dices.length; i++) {
        const dice = dices[i];
        let split = dice.split('d');
        if (split.length === 1) return arr.push({ n: 0, roll: dice });
        const n = parseInt(split[0]) || 1;
        const roll = parseInt(split[1]);
        arr.push({ n, roll });
    }
    return arr;
}

$('#diceRoll').on('hidden.bs.modal', ev => {
    diceResultContent.text('')
        .hide();
    diceResultDescription.text('')
        .hide();
});

const order = $('#order');
const orderAddText = $('#orderAddText');

function orderAddButtonClick(event) {
    const val = orderAddText.val();
    orderAddText.val('');

    if (!val || val.length === 0)
        return;

    const btn = $(document.createElement('button'));
    btn.attr('class', 'acds-element')
        .text('-');

    const txt = $(document.createElement('input'));
    txt.attr({ type: 'text', class: 'acds-element acds-bottom-text', maxLength: '3' })
        .css({ color: 'darkgray', maxWidth: '3rem', margin: '0px 5px 0px 5px' });

    const li = $(document.createElement('li'));
    li.attr('class', 'ui-state-default')
        .text(val)
        .append(txt, btn);

    btn.on('click', ev => li.remove());

    order.append(li);
}

function adminAnotationsChange(event) {
    const value = $(event.target).val();

    $.ajax('/sheet/admin/note',
        {
            method: 'POST',
            data: { value },
            error: showFailureToastMessage
        });
}

function onChangeEnvironment(ev) {
    const combat = $(ev.target).prop('checked');

    $.ajax('/portrait/environment', {
        method: 'POST',
        data: { combat },
        error: showFailureToastMessage
    });
}

socket.on('info changed', content => {
    let playerID = content.playerID;
    let infoID = content.infoID;
    let value = content.value;

    playerNames.set(playerID, value);

    $(`#info${playerID}${infoID}`).text(value);
});

socket.on('attribute changed', content => {
    let playerID = content.playerID;
    let attrID = content.attributeID;
    let newValue = content.value;
    let newMaxValue = content.maxValue;

    let element = $(`#attribute${playerID}${attrID}`);
    const split = element.text().split('/');

    const value = split[0];
    const maxValue = split[1];

    let newText = '';

    if (newValue)
        newText += `${newValue}/`;
    else
        newText += `${value}/`;

    if (newMaxValue)
        newText += `${newMaxValue}`;
    else
        newText += `${maxValue}`;

    element.text(newText);
});

socket.on('spec changed', content => {
    let playerID = content.playerID;
    let specID = content.specID;
    let value = content.value;

    $(`#spec${playerID}${specID}`).text(value);
});

socket.on('characteristic changed', content => {
    let playerID = content.playerID;
    let charID = content.charID;
    let value = content.value;

    $(`#characteristic${playerID}${charID}`).text(value);
});

socket.on('finance changed', content => {
    let playerID = content.playerID;
    let financeID = content.financeID;
    let value = content.value;

    $(`#finance${playerID}${financeID}`).text(value);
})

socket.on('equipment changed', content => {
    let playerID = content.playerID;
    let equipmentID = content.equipmentID;
    let using = content.using;
    let name = content.name;
    let damage = content.damage;
    let range = content.range;
    let attacks = content.attacks;

    let type = content.type;

    switch (type) {
        case 'create':
            const newIcon = $(document.createElement('i'));
            newIcon.attr('class', using ? 'bi bi-check' : 'bi bi-x');

            const usingRow = $(document.createElement('td'));
            usingRow.attr('id', `equipmentUsing${playerID}${equipmentID}`)
                .append(newIcon);

            const nameRow = $(document.createElement('td'));
            nameRow.text(name);

            const damageRow = $(document.createElement('td'));
            damageRow.text(damage);

            const rangeRow = $(document.createElement('td'));
            rangeRow.text(range);

            const attacksRow = $(document.createElement('td'));
            attacksRow.text(attacks);

            const newRow = $(document.createElement('tr'))
                .attr('id', `equipmentRow${playerID}${equipmentID}`)
                .append(usingRow, nameRow, damageRow, rangeRow, attacksRow);

            $(`#equipmentTable${playerID}`).append(newRow);
            break;
        case 'delete':
            $(`#equipmentRow${playerID}${equipmentID}`).remove();
            break;
        case 'update':
            let icon = using ? 'bi bi-check' : 'bi bi-x';
            $(`#equipmentUsing${playerID}${equipmentID} > i`).attr('class', icon);
            break;
    }
});

socket.on('item changed', content => {
    let playerID = content.playerID;
    let itemID = content.itemID;
    let name = content.name;
    let description = content.description;

    let type = content.type;

    switch (type) {
        case 'create':
            const newData = $(document.createElement('td'));
            newData.attr({ 'data-bs-toggle': 'tooltip', 'data-bs-placement': 'top', 'title': description })
                .text(name);

            const newRow = $(document.createElement('tr'));
            newRow.attr('id', `itemRow${playerID}${itemID}`)
                .append(newData);

            $(`#itemTable${playerID}`).append(newRow);
            break;
        case 'delete':
            $(`#itemRow${playerID}${itemID}`).remove();
            break;
        case 'update':
            $(`#itemRow${playerID}${itemID} > td`).attr('title', description);
            break;
    }
});

const diceList = $('#diceList');

socket.on('dice result', content => {
    let id = content.playerID;
    let playerName = playerNames.get(id);
    if (!playerName)
        playerName = 'Desconhecido';

    let auxDices = content.dices;
    let dices = [];

    if (auxDices) {
        for (let i = 0; i < auxDices.length; i++) {
            const dice = auxDices[i];
            const n = dice.n;
            const roll = dice.roll;

            if (n > 0) dices.push(`${n}d${roll}`);
            else dices.push(roll);
        }
    }

    let results = content.results.map(res => {
        let roll = res.roll;
        let successType = res.successType?.description;
        if (successType) return `${roll} (${successType})`;
        else return roll;
    });

    const children = diceList.children();
    if (children.length > 10)
        children[children.length - 1].remove();

    let html = `<li><span style='color:red;'>${playerName}</span>
    rolou
    <span style='color:lightgreen;'>${dices.join(', ')}</span> 
    e tirou 
    <span style='color:lightgreen;'>${results.join(', ')}</span>.`;

    if (results.length > 1) html += ` Soma: 
    <span style='color:lightgreen;'>${results.reduce((a, b) => a + b)}</span>.`;

    html += '</li>';

    diceList.prepend($(html));
});