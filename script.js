// --- STATE DATA ---
const systemData = {
    level: 5,
    xp: 5450,
    progressSegments: 15,
    filledSegments: 8,
    stats: [
        { name: "WISDOM", value: 102, icon: "fa-book" },
        { name: "CONFIDENCE", value: 110, icon: "fa-user-ninja" },
        { name: "STRENGTH", value: 99, icon: "fa-dumbbell" },
        { name: "DISCIPLINE", value: 105, icon: "fa-lock" },
        { name: "FOCUS", value: 98, icon: "fa-bullseye" }
    ],
    quests: [
        {
            id: 1,
            title: "Write 1 Hour of C++ Code",
            subtitle: "Finish it today",
            tagText: "⚠️ Penalty",
            tagClass: "tag-penalty",
            // Using placeholder Unsplash images for the backgrounds
            image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=500" 
        },
        {
            id: 2,
            title: "Read 20 pages of Literature",
            subtitle: "1x/day • Medium",
            tagText: "🔥 16d",
            tagClass: "tag-streak",
            image: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=500"
        }
    ]
};

// --- RENDER FUNCTIONS ---

function renderProgressBar() {
    const container = document.getElementById('progress-bar');
    container.innerHTML = '';
    
    for (let i = 0; i < systemData.progressSegments; i++) {
        const segment = document.createElement('div');
        segment.className = `progress-segment ${i < systemData.filledSegments ? 'filled' : ''}`;
        container.appendChild(segment);
    }
}

function renderStats() {
    const container = document.getElementById('stats-list');
    container.innerHTML = '';

    systemData.stats.forEach(stat => {
        const statEl = document.createElement('div');
        statEl.className = 'stat-item';
        statEl.innerHTML = `
            <div class="stat-name">
                <i class="fa-solid ${stat.icon}"></i> ${stat.name}
            </div>
            <div class="stat-value">
                <i class="fa-solid fa-caret-up up-arrow"></i> ${stat.value}
            </div>
        `;
        container.appendChild(statEl);
    });
}

function renderQuests() {
    const container = document.getElementById('quest-list');
    container.innerHTML = '';

    systemData.quests.forEach(quest => {
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.style.backgroundImage = `url('${quest.image}')`;
        
        // When clicked, simulate completing the quest
        card.onclick = () => completeQuest(quest.id, card);

        card.innerHTML = `
            <div class="card-content">
                <div class="card-tag ${quest.tagClass}">${quest.tagText}</div>
                <div>
                    <h3 class="card-title">${quest.title}</h3>
                    <p class="card-subtitle"><i class="fa-solid fa-rotate"></i> ${quest.subtitle}</p>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- INTERACTIVITY ---

function completeQuest(id, cardElement) {
    // Add a quick visual flash/scale effect
    cardElement.style.transform = 'scale(0.95)';
    cardElement.style.opacity = '0.5';
    
    setTimeout(() => {
        // Remove the quest from the array
        systemData.quests = systemData.quests.filter(q => q.id !== id);
        
        // Add XP and a Stat point for demo purposes
        systemData.xp += 50;
        systemData.filledSegments += 1;
        systemData.stats[0].value += 1; // Boost Wisdom
        
        // Update DOM
        document.getElementById('player-xp').innerText = systemData.xp.toLocaleString();
        renderProgressBar();
        renderStats();
        renderQuests();
    }, 300);
}

// Initialize everything on load
function init() {
    renderProgressBar();
    renderStats();
    renderQuests();
}

init();
