const playerID = $(document.body).data('player-id');
const attributes = {
    '1': $('.health'),
    '2': $('.sanity'),
    '3': $('.energy')
};

socket.on('environment change', data => {
    const timeout = 100;
    $('.container.switchable .text').fadeOut(timeout);
    setTimeout(() => {
        switch (data.mode) {
            case 'idle':
                $('#idleText').fadeIn(timeout);
                break;
            case 'combat':
                $('#combatText').fadeIn(timeout);
                break;
        }
    }, timeout);
});

socket.on('attribute changed', content => {
    const attributeID = content.attributeID;
    const newValue = content.value;
    const newTotalValue = content.totalValue;
    let newText = `${newValue}`;
    if (attributeID !== '3') newText += `/${newTotalValue}`;
    attributes[attributeID].text(newText);
});

socket.on('attribute status changed', content => {
    const id = content.attrStatusID;

    const stateArray = $('body').data('status-state');
    const updatedAttrStatus = stateArray.find(attr => attr.attribute_status_id === id);
    updatedAttrStatus.value = content.value;
    $('body').data('attributes', stateArray);
    for (const state of stateArray)
        if (state.value) return showAvatar(state.attribute_status_id);
    showAvatar();
});

socket.on('info changed', content => {
    const infoID = content.infoID;
    if (infoID == 1) {
        const value = content.value.toUpperCase() || 'DESCONHECIDO';
        $('.name').text(value);
    }
});

const $dice = $('.dice video');
const dice = $dice[0];
dice.load();
const $result = $('.dice .result');
const $description = $('.dice .description');

const $avatar = $('#avatar');
const $background = $('#background');
const $mainContainer = $('#mainContainer');

const queue = [];
let showingDice = false;
let showingResult = false;
let currentData = null;
const newResultTimeout = 900;

socket.on('dice roll', showDiceRoll);
socket.on('dice result', onDiceResult);

function onDiceResult(data) {
    if (currentData) return queue.push(data);

    if (!showingDice) {
        showDiceRoll();
        return setTimeout(() => onDiceResult(data), newResultTimeout);
    }

    showDiceResult(data);
    setTimeout(() => {
        hideDiceResult(() => {
            hideDiceRoll(() => {
                const next = queue.shift();
                if (next) {
                    showDiceRoll();
                    setTimeout(() => onDiceResult(next), newResultTimeout);
                }
            });
        });
    }, 3000);
}

function showDiceRoll() {
    if (showingDice) return;
    dice.currentTime = 0;
    dice.play();
    $dice.addClass('show');
    $mainContainer.addClass('show');
    showingDice = true;
}

const diceHideTimeout = parseFloat(getComputedStyle(dice)
    .getPropertyValue('transition-duration')) * 1000;
function hideDiceRoll(onHiddenCallback) {
    if (!showingDice) return;
    $dice.removeClass('show');
    setTimeout(() => {
        $mainContainer.removeClass('show');
        showingDice = false;
        currentData = null;
        if (onHiddenCallback) onHiddenCallback();
    }, diceHideTimeout);
}

function showDiceResult(data) {
    if (showingResult) return;

    currentData = data;

    const roll = data.results[0].roll;
    const successType = data.results[0].successType;
    if (successType.isCritical) {
        $result.addClass('critical');
        $description.addClass('critical');
        //TODO: find better details.
    }
    showingResult = true;
    $result.text(roll).fadeIn('slow', () => $description.text(successType.description).fadeIn('slow'));
}

function hideDiceResult(onHiddenCallback) {
    if (!showingResult) return;
    $description.fadeOut('fast', () => $description.text('').removeClass('critical'));
    $result.fadeOut('fast', () => {
        $result.text('').removeClass('critical');
        showingResult = false;
        if (onHiddenCallback) onHiddenCallback();
    });
}

let avatarStateChangeFunc;
function showAvatar(id = 0) {
    avatarStateChangeFunc = null;
    switch (id) {
        case 1:
            id = 0;
            avatarStateChangeFunc = () => {
                $background.addClass('dying');
                $avatar.addClass('unconscious');
            };
            break;
        case 2:
            id = 0;
            avatarStateChangeFunc = () => {
                $background.addClass('weakening');
                $avatar.addClass('unconscious');
            };
            break;
        case 3:
            id = 0;
            avatarStateChangeFunc = () => $avatar.addClass('unconscious');
            break;
    }
    $avatar.fadeOut('fast', () =>
        $avatar.attr('src', `/avatar/${id}?playerID=${playerID}&v=${Date.now()}`));
}

$avatar.on('load', () => {
    $background.removeClass('dying weakening');
    $avatar.removeClass('unconscious');
    if (avatarStateChangeFunc) avatarStateChangeFunc();
    $avatar.fadeIn('fast');
});

socket.on('lineage change', content => {
    const lineageID = content.lineageID;
    const img = $('#lineage');
    img.data('lineage', lineageID);
    img.prop('hidden', !lineageID);

    img.attr('src', `/assets/lineages/frameless/${lineageID}/1.png`);
});

socket.on('lineage node change', content => {
    const index = content.index;
    const img = $('#lineage');
    const lineageID = img.data('lineage');
    img.attr('src', `/assets/lineages/frameless/${lineageID}/${index}.png`);
});

{
    const array = $('body').data('status-state');
    showAvatar(array.find(attr => attr.value)?.attribute_status_id || 0);
}