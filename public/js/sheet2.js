const failureToast = new bootstrap.Toast($('#failureToast')[0], { delay: 4000 });
const failureToastBody = $('#failureToast > .toast-body');

(() => {
    const nodes = $('.lineage-node');

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes.eq(i);
        const idx = node.data('index');

        const height = 150 + 5 * idx;
        node.find('img').css('max-height', `${height}px`);
    }
})();

//General
function showFailureToastMessage(err) {
    console.error(err);
    failureToastBody.text(`Erro ao tentar aplicar mudança - ${err.text}`);
    failureToast.show();
}

function extraInfoChange(event, extraInfoID) {
    let value = $(event.target).val();

    $.ajax('/sheet/player/extrainfo', {
        method: 'POST',
        data: { extraInfoID, value },
        error: showFailureToastMessage
    });
}

function onLineageNodeClick(ev) {
    const parent = $(ev.target).parents('.lineage-node');
    const index = parent.data('index');
    const conquered = parent.data('conquered');
    const available = parent.data('available');
    const cost = parent.data('cost');
    const playerScore = $('#playerScore');
    const currentScore = playerScore.data('score');

    if (cost > currentScore) return alert('Você não possui pontos de linhagem o suficiente.');

    if (conquered || !available) return;

    const newScore = currentScore - cost;

    $.ajax('/sheet/player/lineage/node', {
        method: 'POST',
        data: { index, newScore },
        success: data => {
            $(ev.target).removeClass('unconquered');
            parent.data('conquered', true);
            parent.find('.acds-tooltip .footer').css('color', 'green').text('Você possui essa habilidade.');

            for (const node of data.newNodes) {
                const container = $(`.lineage-node[data-index="${node.index}"`);
                const image = container.find('img');
                image.removeClass('unavailable').addClass('acds-clickable');
                container.data('available', true);
                const tooltip = container.find('.acds-tooltip');
                tooltip.find('.title').text(node.name);
                tooltip.find('.cost').text(node.cost);
                tooltip.find('.description').text(node.description);
                tooltip.find('.footer').text('Você ainda não possui essa habilidade.').css('color', 'yellow');
            }
            
            playerScore.data('score', newScore).text(newScore);
        },
        error: showFailureToastMessage
    })
}

socket.on('lineage change', () => {
    $('#lineageContainer').removeAttr('hidden').empty().append($('<div class="col text-center">Recarregue a página.</div>'));
});

socket.on('score change', content => {
    const score = content.score;
    $('#playerScore').data('score', score).text(score);
});