/*
    Gateway
*/

// 1. Establish connection to the server
const socket = new WebSocket('wss://anthrathesly.ddns.net/wss/');
const sockStatus = function () {
    const self = {
        isReady: false,
        isLoaded: false
    };
    return {
        setReady: function () {
            self.isReady = true;
        },
        isReady: function () {
            return self.isReady;
        },
        setLoaded: function ()  {
            self.isLoaded = true;
        },
        isLoaded: function () {
            return self.isLoaded;
        }
    }
}();

// 2. Event listener for when connection opens
socket.addEventListener('open', (event) => {
    console.log('Connected to WebSocket server!');
    if (sockStatus.isLoaded()) {
        doValidate();
    }
    sockStatus.setReady();
});

// 3. Listen for incoming broadcasts from other users
socket.addEventListener('message', (event) => {
    console.log('Received message from server:', event.data);
    try {
        const data = JSON.parse(event.data);

        const username = localStorage.getItem('username');

        if (data.event == 'user_connected' && data.username == username) {

            window.localStorage.setItem('uuid', data.uuid);
 
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('game-container').style.display = '';
        }
        else if (data.event == 'update') {

            renderContent(JSON.stringify(data.payload));
        }
    }
    catch (e) {
        //ignore for now
    }
});

// 4. Handle errors and disconnection
socket.addEventListener('error', (event) => {
    console.error('WebSocket Error:', event);
});

socket.addEventListener('close', () => {
    console.log('Connection closed.');
});

function doValidate() {

    const uuid = window.localStorage.getItem('uuid');
    const username = localStorage.getItem('username');

    if (uuid) {
        // Test payload matching server criteria
        const authPayload = {
            type: 'validate',
            uuid: uuid,
            username: username
        };

        // Send payload as a JSON string
        socket.send(JSON.stringify(authPayload));
    }
}

function doLogin() {

    const password = document.getElementById('serverPassword').value.trim();
    const username = document.getElementById('displayName').value.trim();

    document.getElementById('serverPassword').value = '';

    if (!password || !username) {
        return;
    }

    window.localStorage.setItem('username', username);

    // Test payload matching server criteria
    const authPayload = {
        type: 'auth',
        password: password,
        username: username
    };

    // Send payload as a JSON string
    socket.send(JSON.stringify(authPayload));
}

//weeeeeeeeeee

const THEME_KEY = "fmk_theme";
const voteValues = ['💋 Fuck', '💍 Marry', '💀 KILL'];

// --------------------------------------------------
// DYNAMIC DOM RENDERING
// --------------------------------------------------

function lockIn(updateServer) {
    document.getElementById('gameGrid').style.display = 'none';
    document.getElementById('nxt-btn').style.display = 'none';

    if (!updateServer) return;

    // Test payload matching server criteria
    const uuid = window.localStorage.getItem('uuid');
    const lockPayload = {
        type: 'lock-in',
        uuid: uuid
    };

    // Send payload as a JSON string
    socket.send(JSON.stringify(lockPayload));
}

const gameInfo = function () {
    const self = {
        round: 0,
        votes: []
    }
    return {
        set: function (round, resultString) {
            if (round == self.round) {
                return true;
            }
            const results = JSON.parse(resultString);
            self.round = round;
            const username = localStorage.getItem('username');
            self.votes = results.find(x => x.player = username)?.votes || [];
            return false;
        },
        getVotes: function () {
            return self.votes;
        },
        updateVote: function (index, value) {
            self.votes[index] = value;
        }
    }
}();

function castVote(charIndex, valueIndex) {

    let voteAvailable = true;

    gameInfo.getVotes().forEach((vote, index) => {

        if (index != charIndex) {
            if (vote == valueIndex) {
                gameInfo.updateVote(index, null);
            }
        }
    });

    gameInfo.updateVote(charIndex, valueIndex);
    updateVotes();
}

function updateVotes() {

    gameInfo.getVotes().forEach((vote, index) => {

        if (vote == null) {
            for (let i=0; i<3; i++) {
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn';
            }
        }
        else {
            for (let i=0; i<3; i++) {
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn op';
            }
            document.getElementById('vote-' + index + '-' + vote).className = 'fmk-btn';
        }
    });

    const uuid = window.localStorage.getItem('uuid');
    const votePayload = {
        type: 'vote',
        uuid: uuid,
        votes: gameInfo.getVotes()
    };

    // Send payload as a JSON string
    socket.send(JSON.stringify(votePayload));
}

function renderContent(payload) {

    const data = JSON.parse(payload);

    // 1. Render Round Title
    document.getElementById("roundTitle").textContent = `Round ${data.round}`;

    // 2. Render Character Grid
    const gameGrid = document.getElementById("gameGrid");
    gameGrid.innerHTML = ""; // Clear existing content

    gameInfo.set(data.round, JSON.stringify(data.results));

    gameGrid.style.display = '';
    document.getElementById('nxt-btn').style.display = 'none';

    data.characters.forEach((char, charIndex) => {
        const col = document.createElement("div");
        col.className = "character-column";
        // Generate F, M, K buttons dynamically and set 'op' class if not selected
        const buttonsHTML = voteValues.map((label, index) => {
            return `<button id="vote-${charIndex}-${index}" onclick="castVote(${charIndex}, ${index})" class="fmk-btn">${label}</button>`;
        }).join("");

        const keyWord = char.name.replace(/"([^"]*)"/g, ''); 

        col.innerHTML = `
            <div class="img-container">
                <img src="${char.image}" alt="${char.name}"/>
            </div>
            <div class="info-box title">
                <a href="#" onclick="googlemethis('${encodeURIComponent(keyWord) + ' ' + encodeURIComponent(char.sourceName)} fanservice')">${char.name}</a>
            </div>
            <div class="info-box subtitle">
                <a href="${char.sourceURL}" target="_new">${char.sourceName}</a>
            </div>
            <div class="button-group">
                ${buttonsHTML}
            </div>
        `;

        gameGrid.appendChild(col);
    });
    console.log('render table');
    // 3. Render Results Table Header
    const tableHeader = document.getElementById("tableHeader");
    let headerHTML = `<th>Player</th>`;
    voteValues.forEach(val => {
        headerHTML += `<th>${val}</th>`;
    });
    tableHeader.innerHTML = headerHTML + '<th>Status</th>';

    // 4. Render Results Table Body
    document.getElementById("resultsTitle").textContent = `Results`;
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";

    let shouldLockIn = true;
    let displayNextButton = true;

    const username = localStorage.getItem('username');

    data.results.forEach(res => {

        const tr = document.createElement("tr");

        let rowHTML = `<td><b>${res.player}</b></td>`;

        res.votes.forEach(charID => {
            rowHTML += `<td><div class="icon">${charID === null ? '-' : '<img class="icon" src="' + data.characters[charID].image + '"/>'}</div></td>`;
        });

        rowHTML += `<td><b>${ res.status == 2 ? '➡️' : res.status == 1 ? '✅' : '⏳' }</b></td>`;

        if (res.player == username) {
            shouldLockIn = res.status == 2;
        }

        if (res.status == 0) {
            displayNextButton = false;
        }

        tr.innerHTML = rowHTML;
        tableBody.appendChild(tr);
    });

    if (displayNextButton) {

        document.getElementById('nxt-btn').style.display = displayNextButton ? '' : 'none';
    }

    if (shouldLockIn) {
        lockIn(false);
    }

    
}

// --------------------------------------------------
// DARK MODE LOGIC
// --------------------------------------------------

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
    const btn = document.getElementById("themeToggle");
    if (btn) {
        btn.textContent = isDark ? "☀️" : "🌙";
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const isDark = savedTheme === "dark";

    if (isDark) {
        document.body.classList.add("dark-mode");
    }

    updateThemeButton(isDark);
}

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    loadTheme();

    const uuid = window.localStorage.getItem('uuid');
    const username = localStorage.getItem('username');

    if (uuid && username) {

        if (sockStatus.isReady()) {
            doValidate();
        }

        sockStatus.setLoaded();
    }
    else {
        document.getElementById('login-container').style.display = '';
    }
});


// --------------------------------------------------
// MISC
// --------------------------------------------------


function googlemethis(character) {
    window.open('https://gprivate.com/search/index.html?q=#gsc.q=' + character + '&gsc.tab=1', '_new');
}
