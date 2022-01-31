{
    const nodes = $('#lineageGraph .lineage-node');

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes.eq(i);
        node.find('img').css('max-height', `${100 + 7 * node.data('level')}px`);
    }
}

{
    const isDivineLineage = $('#lineageContainer').data('divine');
    if (isDivineLineage) {
        const selectNode = $('#selectNode');
        const selectNodeModal = new bootstrap.Modal(selectNode[0]);
        const nodesContainer = $('#selectNodeContainer .container-fluid .nodes');
        const tooltipTemplate = $('#lineageNodeTooltipTemplate').html();

        selectNode.on('hidden.bs.modal', ev => {
            nodesContainer.empty();
        });

        $('.lineage-node img:first, .lineage-node img:last').click(defaultLineageNodeImageClick);
        $('.lineage-node img:not(:last):not(:first)').click(async ev => {
            const currentNode = $(ev.target);
            const parent = currentNode.parents('.lineage-node');
            const currentNodeTooltip = parent.find('.acds-tooltip');
            const index = parent.data('index');
            const conquered = parent.data('conquered');
            const available = parent.data('available');
            const cost = parent.data('cost');
            const playerScore = $('#playerScore');
            const currentScore = playerScore.data('score');

            if (cost > currentScore) return alert('Você não possui pontos de linhagem o suficiente.');
            if (conquered || !available) return;

            try {
                const response = await axios.get('/sheet/lineage/node', { params: { index } });
                for (const node of response.data.nodes) {
                    const col = $('<div class="col-6 p-3 lineage-node"></div>');

                    const tooltip = $(tooltipTemplate);
                    tooltip.find('.title').text(node.name);
                    tooltip.find('.type').text(node.type);
                    tooltip.find('.cost').text(node.cost);
                    tooltip.find('.description').text(node.description);
                    tooltip.find('.footer').text('Você ainda não possui essa habilidade.').css('color', 'yellow');

                    const img = $(`<img class="img-fluid acds-clickable" 
                    src="/assets/lineages/frame/${node.lineage_id}/${index}.png">`);
                    img.click(async () => {
                        const selectNodeCloseButton = $('#selectNodeCloseButton').prop('disabled', true);
                        nodesContainer.find('img').unbind().removeClass('acds-clickable');
                        try {
                            const response = await axios.post('/sheet/player/lineage/node', {
                                index,
                                lineageID: node.lineage_id
                            });
                            currentNode.attr('src', `/assets/lineages/frame/${node.lineage_id}/${index}.png`);
                            currentNodeTooltip.find('.title').text(node.name);
                            currentNodeTooltip.find('.type').text(node.type);
                            currentNodeTooltip.find('.cost').text(node.cost);
                            currentNodeTooltip.find('.description').text(node.description);
                            currentNodeTooltip.find('.footer').text('Você ainda não possui essa habilidade.').css('color', 'yellow');

                            updateLineageTable(currentNode, response.data.newNodes, response.data.newScore);
                        }
                        catch (err) { showFailureToastMessage(err) }
                        selectNodeCloseButton.prop('disabled', false);
                        selectNodeModal.hide();
                    });
                    col.append(img, tooltip);
                    nodesContainer.append(col);
                }

                selectNodeModal.show();
            }
            catch (err) { showFailureToastMessage(err) }
        });
    }
    else {
        $('.lineage-node img').click(defaultLineageNodeImageClick);
    }

    async function defaultLineageNodeImageClick(ev) {
        const currentNode = $(ev.target);
        const parent = currentNode.parents('.lineage-node');
        const index = parent.data('index');
        const conquered = parent.data('conquered');
        const available = parent.data('available');
        const cost = parent.data('cost');
        const currentScore = $('#playerScore').data('score');

        if (cost > currentScore) return alert('Você não possui pontos de linhagem o suficiente.');
        if (conquered || !available) return;
        if (!confirm(`Tem certeza de que deseja usar ${cost} pontos de linhagem para adquirir essa habilidade?`)) return;

        try {
            const response = await axios.post('/sheet/player/lineage/node', { index });
            updateLineageTable(currentNode, response.data.newNodes, response.data.newScore);
        }
        catch (err) { showFailureToastMessage(err) }
    }

    function updateLineageTable(currentNode, newNodes, newScore) {
        const parent = currentNode.parents('.lineage-node');
        currentNode.removeClass('unconquered');
        parent.data('conquered', true);
        parent.find('.acds-tooltip .footer').css('color', 'green').text('Você possui essa habilidade.');

        for (const node of newNodes) {
            const container = $(`.lineage-node[data-index="${node.index}"`);
            const image = container.find('img');
            image.removeClass('unavailable').addClass('acds-clickable');
            container.data('available', true);
            const tooltip = container.find('.acds-tooltip');
            tooltip.find('.title').text(node.name);
            tooltip.find('.type').text(node.type);
            tooltip.find('.cost').text(node.cost);
            tooltip.find('.description').text(node.description);
            tooltip.find('.footer').text('Você ainda não possui essa habilidade.').css('color', 'yellow');
        }

        $('#playerScore').data('score', newScore).text(newScore);
    }
}

socket.on('lineage change', () => {
    $('#lineageContainer').removeAttr('hidden').empty().append($('<div class="col text-center">Recarregue a página.</div>'));
});

socket.on('score change', content => {
    const score = content.score;
    $('#playerScore').data('score', score).text(score);
});