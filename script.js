// --- DOM Elements ---
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const resultContainer = document.getElementById('result-container');
const errorMsg = document.getElementById('error-msg');
const errorText = document.getElementById('error-text');
const loader = document.getElementById('loader');

// Drawer Elements
const historyBtn = document.getElementById('history-btn');
const drawer = document.getElementById('history-drawer');
const closeDrawerBtn = document.getElementById('close-drawer');
const overlay = document.getElementById('overlay');
const drawerList = document.getElementById('drawer-list');
const tabBtns = document.querySelectorAll('.tab-btn');

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

// --- State Management ---
let currentTab = 'saved'; // Default tab
let savedWords = JSON.parse(localStorage.getItem('wordly_saved')) || [];
let searchHistory = JSON.parse(localStorage.getItem('wordly_history')) || [];

// --- Event Listeners ---

// 1. Search Form
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = input.value.trim();
    if (word === "") {
        displayError("Please enter a word to search.");
        return;
    }
    fetchWord(word);
});

// 2. Drawer Toggle
historyBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

// 3. Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');
        // Update state
        currentTab = btn.getAttribute('data-tab');
        renderDrawerList();
    });
});

// --- Core Functions ---

async function fetchWord(word) {
    // Reset UI
    resultContainer.innerHTML = ''; 
    resultContainer.classList.add('hidden');
    errorMsg.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}${word}`);

        if (!response.ok) {
            throw new Error("Word not found. Please try another.");
        }

        const data = await response.json();
        
        // Add to history automatically on successful search
        addToHistory(data[0].word);
        
        renderData(data[0]); 

    } catch (error) {
        displayError(error.message);
    } finally {
        loader.classList.add('hidden');
    }
}

function renderData(data) {
    const { word, phonetics, meanings, sourceUrls } = data;

    // Check if word is already saved
    const isSaved = savedWords.includes(word);
    const starIcon = isSaved ? 'bookmark' : 'bookmark-outline';
    const activeClass = isSaved ? 'saved' : '';

    // Handle Audio & Phonetics
    const phoneticObj = phonetics.find(p => p.audio && p.text) || phonetics[0];
    const audioSrc = phonetics.find(p => p.audio !== '')?.audio || '';
    const phoneticText = phoneticObj ? phoneticObj.text : '';

    let html = `
        <div class="word-header">
            <div class="word-title">
                <h2>
                    ${word}
                    <button onclick="toggleSave('${word}')" class="save-btn ${activeClass}" id="save-btn-${word}" aria-label="Save word">
                        <ion-icon name="${starIcon}"></ion-icon>
                    </button>
                </h2>
                <p class="phonetic">${phoneticText || ''}</p>
            </div>
            ${audioSrc ? `<button onclick="playAudio('${audioSrc}')" class="play-btn" aria-label="Play pronunciation"><ion-icon name="play"></ion-icon></button>` : ''}
        </div>
    `;

    // Loop through meanings
    meanings.forEach(meaning => {
        html += `
            <div class="meaning-block">
                <span class="part-of-speech">${meaning.partOfSpeech}</span>
                <ul class="definition-list">
        `;
        
        // Limit to 3 definitions per part of speech
        meaning.definitions.slice(0, 3).forEach(def => {
            html += `
                <li>
                    ${def.definition}
                    ${def.example ? `<span class="example">"${def.example}"</span>` : ''}
                </li>
            `;
        });

        html += `</ul>`;

        if (meaning.synonyms.length > 0) {
            html += `
                <div class="synonyms-section">
                    <strong>Synonyms: </strong>
                    <span>${meaning.synonyms.slice(0, 5).join(', ')}</span>
                </div>
            `;
        }
        html += `</div>`;
    });

    // Source URL
    if(sourceUrls && sourceUrls.length > 0) {
        html += `<div style="font-size: 0.8rem; color: #555; margin-top: 10px;">
                    <a href="${sourceUrls[0]}" target="_blank" style="color: #555; text-decoration: none;">View Source ↗</a>
                 </div>`;
    }

    resultContainer.innerHTML = html;
    resultContainer.classList.remove('hidden');
}

// --- Helper Functions ---

// Audio Player
window.playAudio = (url) => {
    const audio = new Audio(url);
    audio.play();
};

// Toggle Save/Bookmark
window.toggleSave = (word) => {
    const btn = document.getElementById(`save-btn-${word}`);
    const icon = btn.querySelector('ion-icon');

    if (savedWords.includes(word)) {
        // Remove word
        savedWords = savedWords.filter(w => w !== word);
        btn.classList.remove('saved');
        icon.setAttribute('name', 'bookmark-outline');
    } else {
        // Add word
        savedWords.push(word);
        btn.classList.add('saved');
        icon.setAttribute('name', 'bookmark');
    }
    
    // Update LocalStorage
    localStorage.setItem('wordly_saved', JSON.stringify(savedWords));
    
    // If drawer is open, refresh the list immediately
    if(drawer.classList.contains('open') && currentTab === 'saved') {
        renderDrawerList();
    }
};

// Add to History Logic
function addToHistory(word) {
    // Prevent duplicates by removing if exists
    searchHistory = searchHistory.filter(w => w !== word);
    // Add to front
    searchHistory.unshift(word);
    // Limit to 20 items
    if (searchHistory.length > 20) searchHistory.pop();
    // Save to LocalStorage
    localStorage.setItem('wordly_history', JSON.stringify(searchHistory));
}

// Drawer Functions
function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('visible');
    renderDrawerList();
}

function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('visible');
}

function renderDrawerList() {
    drawerList.innerHTML = '';
    const list = currentTab === 'saved' ? savedWords : searchHistory;

    if (list.length === 0) {
        drawerList.innerHTML = `<li style="color:var(--text-secondary); cursor:default; padding: 20px; text-align: center;">No ${currentTab} items yet.</li>`;
        return;
    }

    list.forEach(word => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${word}</span>
            <ion-icon name="chevron-forward-outline" style="color:var(--text-secondary)"></ion-icon>
        `;
        // Click list item to search that word
        li.addEventListener('click', () => {
            input.value = word;
            fetchWord(word);
            closeDrawer();
        });
        drawerList.appendChild(li);
    });
}

// Error Handler
function displayError(message) {
    errorText.textContent = message;
    errorMsg.classList.remove('hidden');
    loader.classList.add('hidden');
}
