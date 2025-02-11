//Curses
const addCurseList = $("#addCurseList");
const addCurseButton = $("#addCurseButton");
const description = $("#addCurseContainer").find(".curse-description");
description.text(addCurseList.find("option:selected").data("description"));
{
  const addCurseModal = new bootstrap.Modal($("#addCurse")[0]);
  const addCurseCloseButton = $("#addCurseCloseButton");
  const addCurseContainer = $("#addCurseContainer");
  const addLoading = addCurseContainer.find(".loading");

  $("#addCurse").on("hidden.bs.modal", () => {
    description.text(
      addCurseList.find("option:selected").data("description") || ""
    );
    addCurseContainer.show();
    addCurseCloseButton.prop("disabled", false);
    addLoading.hide();
  });

  addCurseList.change((ev) => {
    description.text($(ev.target).data("description"));
  });

  addCurseButton.click(async (ev) => {
    addCurseContainer.hide();
    addCurseButton.prop("disabled", true);
    addCurseCloseButton.prop("disabled", true);
    addLoading.show();

    const curseID = parseInt(addCurseList.val());

    try {
      const response = await axios.put("/sheet/player/curse", { curseID });
      const curse = response.data.curse;

      const container = $($("#curseContainerTemplate").html());
      container.data("curse-id", curse.curse_id);
      const main = container.find(".main");
      main.find(".name").text(curse.name);
      main.find(".level").text(curse.level).data("level", curse.level);
      main.find(".description").text(curse.description);
      const focuses = container.find(".focuses");
      const select = focuses.find("select");
      for (const focus of curse.focuses) {
        select.append(
          $(
            `<option value="${focus.characteristic_id}" title="${focus.description}">${focus.name}</option>`
          )
        );
      }
      focuses.find(".description").text(curse.focuses[0].description);

      addCurseList.find(`option[value="${curseID}"]`).remove();
      $("#playerCurses").append(container);
    } catch (err) {
      showFailureToastMessage(err);
    }
    addCurseButton.prop("disabled", addCurseList.children().length === 0);
    addCurseModal.hide();
  });

  socket.on("curse added", (content) => {
    const curseID = content.curseID;
    const name = content.name;
    const contentDescription = content.description;

    if (
      curseList.find("tr").filter((i, el) => $(el).data("curse-id") === curseID)
        .length > 0 ||
      addCurseList.find(`option[value="${curseID}"]`).length > 0
    )
      return;

    const opt = $(
      `<option value="${curseID}" data-description="${contentDescription}">${name}</option>`
    );
    addCurseList.append(opt);
    addCurseButton.prop("disabled", false);
    description.text(addCurseList.find("option:selected").data("description"));
  });

  socket.on("curse removed", (content) => {
    const curseID = content.curseID;
    addCurseList.find(`option[value="${curseID}"]`).remove();
    addCurseButton.prop("disabled", addCurseList.children().length === 0);
    description.text(
      addCurseList.find("option:selected").data("description") || ""
    );
  });

  socket.on("curse changed", (content) => {
    const curseID = content.curseID;
    const name = content.name;
    const contentDescription = content.description;
    const level = content.level;

    const container = $(`.curse-container[data-curse-id="${curseID}"] .main`);
    if (container.length > 0) {
      if (name) container.find(".name").text(name);
      if (contentDescription)
        container.find(".description").text(contentDescription);
      if (level) container.find(".level").text(level);
    } else {
      const opt = addCurseList.find(`option[value="${curseID}"]`);
      if (name) opt.text(name);
      if (contentDescription) opt.data("description", contentDescription);
    }
    description.text(
      addCurseList.find("option:selected").data("description") || ""
    );
  });
}

async function onCurseDelete(ev) {
  if (!confirm("Tem certeza que quer remover essa maldição?")) return;

  const container = $(ev.target).parents(".curse-container");
  const curseID = container.data("curse-id");
  const main = container.find(".main");
  const name = main.find(".name").text();
  const txtDesc = main.find(".description").text();

  try {
    await axios.delete("/sheet/player/curse", { data: { curseID } });

    const focus = container.find(".focus");
    if (!focus.prop("hidden")) {
      const characteristicID = focus.data("characteristic-id");
      const remaining = $(
        `.characteristic-container[data-characteristic-id="${characteristicID}"] .remaining`
      );
      remaining
        .data(
          "value",
          remaining.data("value") + main.find(".level").data("level")
        )
        .text(remaining.data("value"));
    }

    if (addCurseList.find(`option[value="${curseID}"]`).length === 0)
      addCurseList.append(
        $(
          `<option value="${curseID}" data-description="${txtDesc}">${name}</option>`
        )
      );
    container.remove();
    addCurseButton.prop("disabled", false);
    description.text(addCurseList.find("option:selected").data("description"));
  } catch (err) {
    showFailureToastMessage(err);
  }
}

async function onCurseApply(ev) {
  if (
    !confirm(
      "Tem certeza que quer aplicar o foco? Você não poderá mudar depois."
    )
  )
    return;

  const container = $(ev.target).parents(".curse-container");
  const focusesContainer = $(ev.target).parents(".focuses");
  const opt = focusesContainer.find("select option:selected");

  const curseID = container.data("curse-id");
  const characteristicID = parseInt(opt.val());
  const name = opt.text();
  const description = opt.attr("title");
  const lv = container.find(".main .level");
  const current = $(
    `.characteristic-container[data-characteristic-id="${characteristicID}"] .remaining`
  );
  const newVal = current.data("value") - lv.data("level");

  if (newVal < 0) return alert("Pontos de atributo insuficientes.");

  try {
    await axios.post("/sheet/player/curse", { curseID, characteristicID });

    const focus = container.find(".focus");
    focus.data("characteristic-id", characteristicID);
    focus.find(".name").text(name);
    focus.find(".description").text(description);
    current.text(newVal).data("value", newVal);
    focusesContainer.remove();
    focus.prop("hidden", false);
  } catch (err) {
    showFailureToastMessage(err);
  }
}

function onCurseSelectChange(ev) {
  const parent = $(ev.target).parents(".focuses");
  const description = $(ev.target).find("option:selected").attr("title");
  parent.find(".description").text(description || "");
}

//Lineage
{
  const nodes = $("#lineageGraph .lineage-node");

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.eq(i);
    node.find("img").css("max-height", `${100 + 7 * node.data("level")}px`);
  }
}

{
  const isDivineLineage = $("#lineageContainer").data("divine");
  if (isDivineLineage) {
    const selectNode = $("#selectNode");
    const selectNodeModal = new bootstrap.Modal(selectNode[0]);
    const nodesContainer = $("#selectNodeContainer .container-fluid .nodes");
    const tooltipTemplate = $("#lineageNodeTooltipTemplate").html();

    selectNode.on("hidden.bs.modal", (ev) => {
      nodesContainer.empty();
    });

    $(".lineage-node img:first, .lineage-node img:last").click(
      defaultLineageNodeImageClick
    );
    $(".lineage-node img:not(:last):not(:first)").click(async (ev) => {
      const currentNode = $(ev.target);
      const currentNodeContainer = currentNode.parents(".lineage-node");
      const currentNodeTooltip = currentNodeContainer.find(".acds-tooltip");
      const index = currentNodeContainer.data("index");
      const conquered = currentNodeContainer.data("conquered");
      const available = currentNodeContainer.data("available");
      const cost = currentNodeContainer.data("cost");
      const playerScore = $("#playerScore");
      const currentScore = playerScore.data("score");

      if (cost > currentScore)
        return alert("Você não possui pontos de linhagem o suficiente.");
      if (conquered || !available) return;

      try {
        const response = await axios.get("/sheet/lineage/node", {
          params: { index },
        });
        for (const node of response.data.nodes) {
          const col = $('<div class="col-6 p-3 lineage-node"></div>');

          const tooltip = $(tooltipTemplate);
          tooltip.find(".title").text(node.name);
          tooltip.find(".type").text(node.type);
          tooltip.find(".cost").text(node.cost);
          tooltip.find(".description").text(node.description);
          tooltip
            .find(".footer")
            .text("Você ainda não possui essa habilidade.")
            .css("color", "yellow");

          const img = $(`<img class="img-fluid acds-clickable" 
                    src="/assets/lineages/frame/${node.lineage_id}/${index}.png">`);
          img.click(async () => {
            const selectNodeCloseButton = $("#selectNodeCloseButton").prop(
              "disabled",
              true
            );
            nodesContainer.find("img").unbind().removeClass("acds-clickable");
            try {
              const response = await axios.post("/sheet/player/lineage/node", {
                index,
                lineageID: node.lineage_id,
              });

              currentNodeContainer
                .data("cost", node.cost)
                .data("conquered", true);
              currentNodeTooltip.find(".type").text(node.type);
              currentNodeTooltip.find(".cost").text(node.cost);
              currentNodeTooltip.find(".description").text(node.description);
              currentNodeTooltip
                .find(".footer")
                .text("Você possui essa habilidade.")
                .css("color", "green");

              updateLineageTable(
                currentNode,
                response.data.newNodes,
                response.data.newScore
              );
            } catch (err) {
              showFailureToastMessage(err);
            }
            selectNodeCloseButton.prop("disabled", false);
            selectNodeModal.hide();
          });
          col.append(img, tooltip);
          nodesContainer.append(col);
        }

        selectNodeModal.show();
      } catch (err) {
        showFailureToastMessage(err);
      }
    });
  } else {
    $(".lineage-node img").click(defaultLineageNodeImageClick);
  }

  async function defaultLineageNodeImageClick(ev) {
    const currentNode = $(ev.target);
    const parent = currentNode.parents(".lineage-node");
    const index = parent.data("index");
    const conquered = parent.data("conquered");
    const available = parent.data("available");
    const cost = parent.data("cost");
    const currentScore = $("#playerScore").data("score");

    if (cost > currentScore)
      return alert("Você não possui pontos de linhagem o suficiente.");
    if (conquered || !available) return;
    if (
      !confirm(
        `Tem certeza de que deseja usar ${cost} pontos de linhagem para adquirir essa habilidade?`
      )
    )
      return;

    try {
      const response = await axios.post("/sheet/player/lineage/node", {
        index,
      });
      updateLineageTable(
        currentNode,
        response.data.newNodes,
        response.data.newScore
      );
    } catch (err) {
      showFailureToastMessage(err);
    }
  }

  function updateLineageTable(currentNode, newNodes, newScore) {
    const parent = currentNode.parents(".lineage-node");
    currentNode.removeClass("unconquered");
    parent.data("conquered", true);
    parent
      .find(".acds-tooltip .footer")
      .css("color", "green")
      .text("Você possui essa habilidade.");

    for (const node of newNodes) {
      const container = $(`.lineage-node[data-index="${node.index}"`);
      const image = container.find("img");
      image.removeClass("unavailable").addClass("acds-clickable");
      container.data("available", true);
      const tooltip = container.find(".acds-tooltip");
      tooltip.find(".title").text(node.name);
      tooltip.find(".type").text(node.type);
      tooltip.find(".cost").text(node.cost);
      tooltip.find(".description").text(node.description);
      tooltip
        .find(".footer")
        .text("Você ainda não possui essa habilidade.")
        .css("color", "yellow");
    }

    $("#playerScore").data("score", newScore).text(newScore);
  }
}

socket.on("lineage change", () => {
  $("#lineageContainer")
    .removeAttr("hidden")
    .empty()
    .append($('<div class="col text-center">Recarregue a página.</div>'));
});

socket.on("score change", (content) => {
  const score = content.score;
  $("#playerScore").data("score", score).text(score);
});
