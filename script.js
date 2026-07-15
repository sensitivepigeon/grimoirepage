"use strict";

/* Grimoire — Bargain Generator (Phase 1) */

const QUEST_SCHEMA = [
  { key: "title",          label: "Title",           type: "text",       required: true,
    help: "Display title of the bargain." },
  { key: "lore",           label: "Lore",            type: "text",       required: false,
    help: "Short flavor line. Leave blank for none." },
  { key: "description",    label: "Description",     type: "textarea",   required: false,
    help: "Detail-page text. Leave blank for no detail page." },
  { key: "patron",         label: "Patron",          type: "text",       required: false,
    help: "Patron KEY, not a display name (e.g. reckoner). Blank for none." },
  { key: "format",         label: "Format",          type: "int",        required: false, default: 1,
    help: "Reserved version field. Leave at 1." },
  { key: "tier",           label: "Tier",            type: "select",     required: true,
    options: [1, 2, 3, 4, 5],
    help: "Rank 1-5. This is what gates the quest." },
  { key: "required_item",  label: "Required item",   type: "item",       required: true,
    help: "Item the player turns in, e.g. minecraft:diamond." },
  { key: "required_count", label: "Required count",  type: "int",        required: true, default: 1,
    help: "How many of the required item. Must be 1 or more." },
  { key: "rewards",        label: "Reward",          type: "reward",     required: true,
    help: "What the player receives. At least one reward is required." },
  { key: "repeatable",     label: "Repeatable",      type: "checkbox",   required: false, default: true,
    help: "Ticked = can be done again. Unticked = one-and-done." },
  { key: "requires_quest", label: "Requires quest(s)", type: "multi-text", required: false,
    placeholder: "tier1/some_quest",
    help: "Prerequisite quest ID(s). ALL must be completed first. Add a row per prerequisite. Blank for none." },
];


function renderForm() {
  const container = document.getElementById("form-fields");

  QUEST_SCHEMA.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.textContent = field.label + (field.required ? " *" : "");
    label.setAttribute("for", "field-" + field.key);
    wrapper.appendChild(label);

    wrapper.appendChild(buildInput(field));

    const help = document.createElement("small");
    help.className = "help";
    help.textContent = field.help;
    wrapper.appendChild(help);

    container.appendChild(wrapper);
  });
}

function buildInput(field) {
  const id = "field-" + field.key;

  switch (field.type) {
    case "text":
    case "item": {
      const input = document.createElement("input");
      input.type = "text";
      input.id = id;
      return input;
    }
    case "textarea": {
      const area = document.createElement("textarea");
      area.id = id;
      area.rows = 3;
      return area;
    }
    case "int": {
      const input = document.createElement("input");
      input.type = "number";
      input.id = id;
      if (field.default !== undefined) input.value = field.default;
      return input;
    }
    case "select": {
      const select = document.createElement("select");
      select.id = id;
      field.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      return select;
    }
    case "checkbox": {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      if (field.default === true) input.checked = true;
      return input;
    }
    case "reward": {
      const group = document.createElement("div");
      group.className = "reward-row";

      const item = document.createElement("input");
      item.type = "text";
      item.id = id + "-item";
      item.placeholder = "reward item, e.g. minecraft:diamond";

      const count = document.createElement("input");
      count.type = "number";
      count.id = id + "-count";
      count.value = 1;
      count.className = "count-input";

      group.appendChild(item);
      group.appendChild(count);
      return group;
    }
    case "multi-text": {
      const container = document.createElement("div");
      container.id = id;
      container.className = "multi-text";

      const rows = document.createElement("div");
      rows.className = "multi-rows";
      container.appendChild(rows);

      addTextRow(rows, field);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "add-row";
      addBtn.textContent = "+ Add";
      addBtn.addEventListener("click", () => addTextRow(rows, field));
      container.appendChild(addBtn);

      return container;
    }
    default:
      throw new Error("Unknown field type: " + field.type);
  }
}

function addTextRow(rows, field) {
  const row = document.createElement("div");
  row.className = "row";

  const input = document.createElement("input");
  input.type = "text";
  if (field.placeholder) input.placeholder = field.placeholder;
  row.appendChild(input);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-row";
  removeBtn.textContent = "\u2013";
  removeBtn.addEventListener("click", () => row.remove());
  row.appendChild(removeBtn);

  rows.appendChild(row);
}


function collectQuest() {
  const quest = {};

  QUEST_SCHEMA.forEach((field) => {
    const id = "field-" + field.key;

    switch (field.type) {
      case "text":
      case "item":
      case "textarea":
        quest[field.key] = document.getElementById(id).value.trim();
        break;
      case "int":
        quest[field.key] = document.getElementById(id).valueAsNumber;
        break;
      case "select":
        quest[field.key] = Number(document.getElementById(id).value);
        break;
      case "checkbox":
        quest[field.key] = document.getElementById(id).checked;
        break;
      case "reward": {
        const item = document.getElementById(id + "-item").value.trim();
        const count = document.getElementById(id + "-count").valueAsNumber;
        quest.rewards = [{ item: item, count: count }];
        break;
      }
      case "multi-text": {
        const container = document.getElementById(id);
        const inputs = container.querySelectorAll('input[type="text"]');
        const values = [];
        inputs.forEach((inp) => {
          const v = inp.value.trim();
          if (v) values.push(v);
        });
        quest[field.key] = values;
        break;
      }
    }
  });

  return quest;
}


function validate(quest) {
  const errors = [];

  if (!quest.title) errors.push("Title is required.");
  if (!(quest.tier >= 1 && quest.tier <= 5)) errors.push("Tier must be between 1 and 5.");
  if (!quest.required_item) errors.push("Required item is required.");
  if (!isPositiveInt(quest.required_count)) errors.push("Required count must be a whole number, 1 or more.");

  const reward = quest.rewards[0];
  if (!reward.item) errors.push("Reward item is required.");
  if (!isPositiveInt(reward.count)) errors.push("Reward count must be a whole number, 1 or more.");

  return errors;
}

function isPositiveInt(n) {
  return Number.isInteger(n) && n >= 1;
}


function buildJson(quest) {
  const out = {};

  out.title = quest.title;

  if (quest.lore) out.lore = quest.lore;
  if (quest.description) out.description = quest.description;
  if (quest.patron) out.patron = quest.patron;

  if (quest.format && quest.format !== 1) out.format = quest.format;

  out.tier = quest.tier;
  out.required_item = quest.required_item;
  out.required_count = quest.required_count;

  out.rewards = quest.rewards;

  if (quest.repeatable === false) out.repeatable = false;

  const prereqs = quest.requires_quest;
  if (prereqs.length === 1) out.requires_quest = prereqs[0];
  else if (prereqs.length > 1) out.requires_quest = prereqs;

  return JSON.stringify(out, null, 2);
}


function generate() {
  const quest = collectQuest();
  const errors = validate(quest);

  const errorBox = document.getElementById("errors");
  const output = document.getElementById("output");

  if (errors.length > 0) {
    errorBox.textContent = "Fix these first:\n- " + errors.join("\n- ");
    output.value = "";
    return;
  }

  errorBox.textContent = "";
  output.value = buildJson(quest);
}

function copyOutput() {
  const output = document.getElementById("output");
  if (!output.value) return;
  navigator.clipboard.writeText(output.value).then(() => {
    const btn = document.getElementById("copy-btn");
    const original = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = original), 1200);
  });
}

function downloadOutput() {
  const output = document.getElementById("output");
  if (!output.value) return;

  let id = document.getElementById("quest-id").value.trim();
  if (!id) id = "quest";
  const fileName = id.split("/").pop() + ".json";

  const blob = new Blob([output.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}


document.addEventListener("DOMContentLoaded", () => {
  renderForm();
  document.getElementById("generate-btn").addEventListener("click", generate);
  document.getElementById("copy-btn").addEventListener("click", copyOutput);
  document.getElementById("download-btn").addEventListener("click", downloadOutput);
});
