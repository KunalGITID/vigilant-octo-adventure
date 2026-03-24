/* ═══════════════════════════════════════════════════════════════
   THE SYSTEM — GAME ENGINE (script.js)
   
   Architecture Overview:
   ──────────────────────
   1. DATA LAYER     — Player state object + localStorage save/load
   2. BOOT SEQUENCE  — Terminal typing animation on first load
   3. RENDER ENGINE  — Functions that update DOM from player state
   4. QUEST SYSTEM   — Add, complete, delete quests + XP rewards
   5. LEVEL SYSTEM   — XP threshold check, level-up modal, stat allocation
   6. PENALTY SYSTEM — "Missed Task" debuff (aesthetic + HP)
   7. EVENT WIRING   — All event listeners at the bottom
   
   All game constants are grouped at the top for easy tuning.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ─────────────────────────────────────────────
   GAME CONSTANTS (tweak these to rebalance)
   ───────────────────────────────────────────── */
const XP_PER_QUEST     = 10;   // XP gained per completed quest
const XP_TO_LEVEL      = 100;  // XP needed to level up
const POINTS_PER_LEVEL = 3;    // Stat points awarded per level-up
const HP_MAX           = 100;  // Maximum HP
const HP_PENALTY       = 10;   // HP lost per missed task
const BAR_LENGTH       = 20;   // Number of segments in ASCII bars
const SAVE_KEY         = "the_system_save"; // localStorage key

/* Rank thresholds — maps level ranges to manhwa-style ranks */
const RANKS = [
  { min: 1,  label: "E" },
  { min: 5,  label: "D" },
  { min: 10, label: "C" },
  { min: 20, label: "B" },
  { min: 35, label: "A" },
  { min: 50, label: "S" },
];


/* ═══════════════════════════════════════════════════════════════
   1. DATA LAYER — Player State + Persistence
   ═══════════════════════════════════════════════════════════════ */

/**
 * Returns a fresh default player state.
 * Used on first visit or when save is corrupted/missing.
 */
function createDefaultPlayer() {
  return {
    name:   "PLAYER",
    level:  1,
    xp:     0,
    hp:     HP_MAX,
    stats:  { str: 0, int: 0, agi: 0 },
    quests: [],           // Array of { id, text, completed }
    // Track IDs for quests so we can reference them uniquely
    nextQuestId: 1,
  };
}

/**
 * Load player data from localStorage.
 * Falls back to defaults if nothing saved or data is invalid.
 */
function loadPlayer() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultPlayer();
    const parsed = JSON.parse(raw);
    // Merge with defaults so newly added fields don't break old saves
    return { ...createDefaultPlayer(), ...parsed };
  } catch (e) {
    console.warn("[SYSTEM] Corrupted save data. Resetting.", e);
    return createDefaultPlayer();
  }
}

/**
 * Persist current player state to localStorage.
 * Called after every state mutation.
 */
function savePlayer() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  } catch (e) {
    console.error("[SYSTEM] Failed to save.", e);
  }
}

// Initialize player state (global, used everywhere)
let player = loadPlayer();


/* ═══════════════════════════════════════════════════════════════
   2. BOOT SEQUENCE — Terminal Typing Animation
   ═══════════════════════════════════════════════════════════════ */

/**
 * Simulates typing a line of text into the boot log element.
 * Returns a Promise that resolves when the line is fully typed.
 *
 * @param {HTMLElement} el - The <pre> element to type into
 * @param {string} text   - The line of text to type
 * @param {number} speed  - Milliseconds between each character
 */
function typeLine(el, text, speed = 30) {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        el.textContent += "\n";
        resolve();
      }
    }, speed);
  });
}

/**
 * Runs the full boot sequence:
 * 1. Types out system messages one by one
 * 2. Fades out the overlay
 * 3. Reveals the main app
 */
async function runBootSequence() {
  const overlay = document.getElementById("boot-overlay");
  const log     = document.getElementById("boot-log");
  const cursor  = document.getElementById("boot-cursor");
  const app     = document.getElementById("app");

  // The lines displayed during "boot"
  const lines = [
    "[SYSTEM INITIALIZING...]",
    "[LOADING QUEST DATABASE...]",
    "[SYNCING PLAYER DATA...]",
    `[PLAYER RANK: ${getRank(player.level)}]`,
    `[WELCOME, ${player.name}]`,
  ];

  // Type each line with a small pause between them
  for (const line of lines) {
    await typeLine(log, line, 25);
    await sleep(200);
  }

  // Hide the blinking cursor
  cursor.style.display = "none";

  // Brief pause before transition
  await sleep(400);

  // Fade out boot overlay, then reveal app
  overlay.classList.add("fade-out");
  setTimeout(() => {
    overlay.style.display = "none";
    app.classList.remove("hidden");
    // Render the full UI from saved state
    renderAll();
  }, 600);
}

/** Simple sleep utility (ms) */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


/* ═══════════════════════════════════════════════════════════════
   3. RENDER ENGINE — Update DOM from Player State
   ═══════════════════════════════════════════════════════════════ */

/**
 * Master render function. Calls all sub-renderers.
 * Invoke this after any state change.
 */
function renderAll() {
  renderHUD();
  renderQuests();
}

/**
 * Update the HUD panel: level, rank, HP bar, XP bar, stats.
 */
function renderHUD() {
  // Level & Rank
  document.getElementById("hud-level").textContent = player.level;
  document.getElementById("hud-rank").textContent  = getRank(player.level);
  document.getElementById("hud-name").textContent   = player.name;

  // HP Bar
  document.getElementById("hp-bar").textContent   = buildAsciiBar(player.hp, HP_MAX);
  document.getElementById("hp-value").textContent  = `${player.hp}/${HP_MAX}`;

  // XP Bar
  document.getElementById("xp-bar").textContent   = buildAsciiBar(player.xp, XP_TO_LEVEL);
  document.getElementById("xp-value").textContent  = `${player.xp}/${XP_TO_LEVEL}`;

  // Stats
  document.getElementById("stat-str").textContent = player.stats.str;
  document.getElementById("stat-int").textContent = player.stats.int;
  document.getElementById("stat-agi").textContent = player.stats.agi;
}

/**
 * Build an ASCII progress bar string.
 * Example: [||||||||..........]
 *
 * @param {number} current - Current value (e.g., 60)
 * @param {number} max     - Maximum value (e.g., 100)
 * @returns {string}       - The ASCII bar string
 */
function buildAsciiBar(current, max) {
  const filled = Math.round((current / max) * BAR_LENGTH);
  const empty  = BAR_LENGTH - filled;
  // "│" (pipe) for filled, "·" (middle dot) for empty
  return "[" + "│".repeat(filled) + "·".repeat(empty) + "]";
}

/**
 * Determine the player's rank letter based on their level.
 * Iterates rank thresholds in reverse to find the highest match.
 */
function getRank(level) {
  let rank = RANKS[0].label;
  for (const r of RANKS) {
    if (level >= r.min) rank = r.label;
  }
  return rank;
}

/**
 * Render the quest list from player.quests array.
 * Shows/hides the "no quests" placeholder as needed.
 */
function renderQuests() {
  const list     = document.getElementById("quest-list");
  const emptyMsg = document.getElementById("quest-empty");

  // Clear existing DOM nodes
  list.innerHTML = "";

  if (player.quests.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");

  // Build a <li> for each quest
  player.quests.forEach((quest) => {
    const li = document.createElement("li");
    li.className = "quest-item" + (quest.completed ? " completed" : "");
    li.dataset.id = quest.id;

    // Checkbox-style marker
    const marker = document.createElement("span");
    marker.className = "quest-marker";
    marker.textContent = quest.completed ? "[✓]" : "[ ]";

    // Quest text
    const text = document.createElement("span");
    text.className = "quest-text";
    text.textContent = quest.text;

    // XP reward indicator
    const xp = document.createElement("span");
    xp.className = "quest-xp";
    xp.textContent = `+${XP_PER_QUEST}xp`;

    // Delete button (×)
    const del = document.createElement("button");
    del.className = "quest-delete";
    del.textContent = "×";
    del.title = "Remove quest";

    // --- Event: Click quest to complete it ---
    li.addEventListener("click", (e) => {
      // Don't trigger completion if they clicked the delete button
      if (e.target === del) return;
      if (!quest.completed) {
        completeQuest(quest.id);
      }
    });

    // --- Event: Delete quest ---
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteQuest(quest.id);
    });

    li.append(marker, text, xp, del);
    list.appendChild(li);
  });
}


/* ═══════════════════════════════════════════════════════════════
   4. QUEST SYSTEM — Add, Complete, Delete
   ═══════════════════════════════════════════════════════════════ */

/**
 * Add a new quest to the player's quest list.
 * @param {string} text - The quest description
 */
function addQuest(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  player.quests.push({
    id:        player.nextQuestId++,
    text:      trimmed,
    completed: false,
  });

  savePlayer();
  renderQuests();
}

/**
 * Mark a quest as completed, award XP, and trigger flash effect.
 * Then check if the player has leveled up.
 *
 * @param {number} questId - The quest's unique ID
 */
function completeQuest(questId) {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || quest.completed) return;

  // Mark as completed
  quest.completed = true;

  // Award XP
  player.xp += XP_PER_QUEST;

  savePlayer();
  renderAll();

  // Trigger the neon flash animation on the quest item
  const li = document.querySelector(`.quest-item[data-id="${questId}"]`);
  if (li) {
    li.classList.add("flash");
    // Remove the animation class after it finishes so it can replay
    setTimeout(() => li.classList.remove("flash"), 600);
  }

  // Check for level up AFTER rendering
  checkLevelUp();
}

/**
 * Remove a quest from the list entirely.
 * @param {number} questId
 */
function deleteQuest(questId) {
  player.quests = player.quests.filter((q) => q.id !== questId);
  savePlayer();
  renderQuests();
}


/* ═══════════════════════════════════════════════════════════════
   5. LEVEL SYSTEM — Level-Up Detection + Stat Allocation Modal
   ═══════════════════════════════════════════════════════════════ */

/**
 * Check if player XP >= threshold. If so, trigger level up.
 * Handles multiple level-ups if XP somehow exceeds 200+ at once.
 */
function checkLevelUp() {
  if (player.xp >= XP_TO_LEVEL) {
    // Calculate overflow XP (in case of future multi-XP rewards)
    const overflow = player.xp - XP_TO_LEVEL;

    player.level += 1;
    player.xp = overflow;

    // Restore HP to max on level up (a small reward)
    player.hp = HP_MAX;

    savePlayer();
    renderAll();

    // Show the stat allocation modal
    openLevelUpModal();
  }
}

/**
 * Open the level-up modal and set up stat allocation.
 */
function openLevelUpModal() {
  const modal        = document.getElementById("levelup-modal");
  const pointsLeft   = document.getElementById("modal-points-left");
  const confirmBtn   = document.getElementById("modal-confirm");
  const strVal       = document.getElementById("modal-str");
  const intVal       = document.getElementById("modal-int");
  const agiVal       = document.getElementById("modal-agi");

  // Temporary allocation state (doesn't mutate player until confirmed)
  let remaining = POINTS_PER_LEVEL;
  let allocated = { str: 0, int: 0, agi: 0 };

  // Initialize display values to current player stats
  strVal.textContent = player.stats.str;
  intVal.textContent = player.stats.int;
  agiVal.textContent = player.stats.agi;
  pointsLeft.textContent = remaining;
  confirmBtn.disabled = true;

  // Show the modal
  modal.classList.remove("hidden");

  // Update modal title to show new level
  document.getElementById("modal-title").textContent =
    `[ LEVEL ${player.level} ]`;

  // --- Handle stat button clicks ---
  // We use event delegation on the modal stats container
  const statsContainer = modal.querySelector(".modal-stats");

  // Remove any old listener (safety for multiple level-ups)
  const newContainer = statsContainer.cloneNode(true);
  statsContainer.parentNode.replaceChild(newContainer, statsContainer);

  newContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".stat-btn");
    if (!btn || remaining <= 0) return;

    const stat = btn.dataset.stat; // "str", "int", or "agi"
    allocated[stat] += 1;
    remaining -= 1;

    // Update displayed values (current + allocated)
    document.getElementById("modal-str").textContent = player.stats.str + allocated.str;
    document.getElementById("modal-int").textContent = player.stats.int + allocated.int;
    document.getElementById("modal-agi").textContent = player.stats.agi + allocated.agi;
    document.getElementById("modal-points-left").textContent = remaining;

    // Disable all +1 buttons when no points left
    if (remaining <= 0) {
      newContainer.querySelectorAll(".stat-btn").forEach((b) => {
        b.disabled = true;
      });
    }

    // Enable confirm only when all points are spent
    document.getElementById("modal-confirm").disabled = remaining > 0;
  });

  // --- Handle confirm ---
  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

  newConfirm.addEventListener("click", () => {
    // Apply allocated points to player
    player.stats.str += allocated.str;
    player.stats.int += allocated.int;
    player.stats.agi += allocated.agi;

    savePlayer();
    renderAll();

    // Close modal
    modal.classList.add("hidden");

    // Re-enable stat buttons for next time
    modal.querySelectorAll(".stat-btn").forEach((b) => {
      b.disabled = false;
    });

    // Check again in case of overflow level-up
    checkLevelUp();
  });
}


/* ═══════════════════════════════════════════════════════════════
   6. PENALTY SYSTEM — Forgiving Debuff
   ═══════════════════════════════════════════════════════════════ */

/**
 * Simulate a "missed task" penalty:
 * - Lose a small amount of HP (clamped to minimum of 1)
 * - Trigger a visual debuff: HUD border goes red and flickers
 * The debuff is temporary (resets after a few seconds).
 */
function applyMissedPenalty() {
  // Reduce HP but never below 1 (can't die from missed quests)
  player.hp = Math.max(1, player.hp - HP_PENALTY);

  savePlayer();
  renderAll();

  // Apply the visual debuff class to the HUD
  const hud = document.querySelector(".hud");
  hud.classList.add("debuff");

  // Remove debuff after the flicker animation completes (~2 seconds)
  setTimeout(() => {
    hud.classList.remove("debuff");
  }, 2000);
}


/* ═══════════════════════════════════════════════════════════════
   7. EVENT WIRING — Connect UI elements to game logic
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  // ─── START BOOT SEQUENCE ───
  runBootSequence();

  // ─── QUEST INPUT: Add quest on button click ───
  const input  = document.getElementById("quest-input");
  const addBtn = document.getElementById("quest-add-btn");

  addBtn.addEventListener("click", () => {
    addQuest(input.value);
    input.value = "";
    input.focus();
  });

  // ─── QUEST INPUT: Add quest on Enter key ───
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addQuest(input.value);
      input.value = "";
    }
  });

  // ─── MISSED TASK BUTTON ───
  document.getElementById("miss-btn").addEventListener("click", () => {
    applyMissedPenalty();
  });
});
