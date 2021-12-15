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
    let attrID = content.attrID;
    let newValue = content.value;
    let newTotalValue = content.totalValue;
    let newText = `${newValue}`;
    if (attrID !== '3') newText += `/${newTotalValue}`;
    attributes[attrID].text(newText);
});

socket.on('attribute status changed', content => {
    const id = content.attrStatusID;
    const state = statusState.find(state => state.id == id);
    if (state) {
        state.value = content.value;
        findAvatar();
    }
    else updateAvatar(parseInt(id));
});

socket.on('info changed', content => {
    const infoID = content.infoID;
    if (infoID == 1) {
        const value = content.value.toUpperCase() || 'DESCONHECIDO';
        $('.name').text(value);
    }
});

const $dice = $('.dice video');
const $result = $('.dice .result');
const $description = $('.dice .description');
const $avatar = $('#avatar');
const $mainContainer = $('#mainContainer');

const queue = [];
let showingDice = false;
let showingResult = false;

socket.on('dice roll', onDiceRoll);
socket.on('dice result', onDiceResult);

function onDiceRoll() {
    if (showingDice) return;
    showDice();
}

function onDiceResult(data) {
    if (showingResult) return queue.push(data);

    if (!showingDice) return rollDice(data);

    const roll = data.results[0].roll;
    const successType = data.results[0].successType;
    if (successType.isCritical) {
        $result.addClass('critical');
        $description.addClass('critical');
        //TODO: play audio.
    }

    $result.text(roll).fadeIn('slow', () => $description.text(successType.description).fadeIn('slow'));
    showingResult = true;
    setTimeout(() => {
        $description.fadeOut('fast', () => $description.text('').removeClass('critical'));
        $result.fadeOut('fast', () => {
            showingResult = false;
            showingDice = false;
            $result.text('').removeClass('critical');
            $dice.removeClass('show');
            setTimeout(() => $mainContainer.removeClass('show'), 600);
            rollDice(queue.shift());
        });
    }, 3500);
}

$dice[0].load();
function showDice() {
    $dice[0].load();
    showingDice = true;
    $dice.addClass('show');
    $mainContainer.addClass('show');
    setTimeout(() => $dice[0].play(), 250);
}

function rollDice(next) {
    if (!next) return;
    setTimeout(() => {
        showDice();
        setTimeout(() => onDiceResult(next), 1000);
    }, 750);
}

function findAvatar() {
    for (const state of statusState) {
        const id = state.id;
        const active = state.value;
        if (active) return updateAvatar(id);
    }
    updateAvatar();
}
findAvatar();

function updateAvatar(id = 0) {
    $avatar.fadeOut('fast', () => {
        switch (id) {
            case 3:
                id = 0;
                $avatar.addClass('unconscious');
                break;
            default:
                $avatar.removeClass('unconscious');
                break;
        }
        $avatar.attr('src', `/avatar/${id}?playerID=${playerID}&v=${Date.now()}`);
    });
}

$avatar.on('load', () => $avatar.fadeIn('fast'));