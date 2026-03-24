// --- STATE MANAGEMENT ---
let player = {
    level: 1,
    xp: 0,
    xpNeeded: 100,
    quests: [
        { id: 1, text: "Write 1 hour of C++ code", completed: false },
        { id: 2, text: "Read 20 pages of literature", completed: false }
    ]
};

// --- DOM ELEMENTS ---
const bootScreen = document.getElementById('boot-screen');
const bootText = document.getElementById('boot-text');
const mainInterface = document.getElementById('main-interface');
const levelDisplay = document.getElementById('level-display');
const xpBar = document.getElementById('xp-bar');
const xpText = document.getElementById('xp-text');
const questList = document.getElementById('quest-list');
const questInput = document.getElementById('quest-input');
const addBtn = document.getElementById('add-btn');

// --- INITIALIZATION & BOOT SEQUENCE ---
function init() {
    loadData();
    runBootSequence();
}

function runBootSequence() {
    const sequence = [
        "[SYSTEM INITIALIZING...]",
        "[CHECKING MANA CIRCUITS...]",
        "[SYNCING PLAYER DATA...]",
        "[WELCOME, PLAYER]"
    ];
    
    let delay = 0;
    sequence.forEach((text, index) => {
        setTimeout(() => {
            bootText.innerText = text;
            if (index === sequence.length - 1) {
                setTimeout(() => {
                    bootScreen.classList.add('hidden');
                    mainInterface.classList.remove('hidden');
                    updateUI();
                }, 1000); // Show main interface after last message
            }
        }, delay);
        delay += 600; // 0.6 seconds between messages
    });
}

// --- CORE SYSTEM MECHANICS ---
function addQuest() {
    const text = questInput.value.trim();
    if (text === "") return;

    const newQuest = {
        id: Date.now(),
        text: text,
        completed: false
    };

    player.quests.push(newQuest);
    questInput.value = "";
    saveData();
    updateUI();
}

function toggleQuest(id) {
    const quest = player.quests.find(q => q.id === id);
    if (!quest) return;

    if (!quest.completed) {
        quest.completed = true;
        gainXP(20); // Award 20 XP for completing a task
    } else {
        // If un-checking a task, you could remove XP, but we keep it forgiving for now
        quest.completed = false; 
    }
    
    saveData();
    updateUI();
}

function gainXP(amount) {
    player.xp += amount;
    
    if (player.xp >= player.xpNeeded) {
        levelUp();
    }
}

function levelUp() {
    player.level += 1;
    player.xp = player.xp - player.xpNeeded; // Carry over excess XP
    player.xpNeeded = Math.floor(player.xpNeeded * 1.2); // Next level requires 20% more XP
    
    // Simple visual alert for now
    setTimeout(() => {
        alert(`[ SYSTEM ALERT ]\n\nYOU HAVE LEVELED UP TO LEVEL ${player.level}!`);
    }, 100);
}

// --- UI UPDATES ---
function updateUI() {
    // Update Stats
    levelDisplay.innerText = player.level;
    xpText.innerText = `${player.xp}/${player.xpNeeded}`;
    
    // Calculate ASCII XP Bar
    const progress = Math.floor((player.xp / player.xpNeeded) * 10);
    let barString = "[";
    for(let i=0; i<10; i++) {
        barString += i < progress ? "|" : ".";
    }
    barString += "]";
    xpBar.innerText = barString;

    // Update Quest List
    questList.innerHTML = "";
    player.quests.forEach(quest => {
        const li = document.createElement('li');
        li.innerText = quest.text;
        if (quest.completed) {
            li.classList.add('completed');
        } else {
            // Add a small XP indicator to uncompleted tasks
            const xpSpan = document.createElement('span');
            xpSpan.classList.add('xp-reward');
            xpSpan.innerText = "+20 XP";
            li.appendChild(xpSpan);
        }
        
        li.onclick = () => toggleQuest(quest.id);
        questList.appendChild(li);
    });
}

// --- LOCAL STORAGE ---
function saveData() {
    localStorage.setItem('systemPlayerData', JSON.stringify(player));
}

function loadData() {
    const saved = localStorage.getItem('systemPlayerData');
    if (saved) {
        player = JSON.parse(saved);
    }
}

// --- EVENT LISTENERS ---
addBtn.addEventListener('click', addQuest);
questInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addQuest();
});

// Start the app
init();
