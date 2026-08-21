/*
    Gateway
*/

// 1. Establish connection to the server
const socket = new WebSocket('wss://anthrathesly.ddns.net/wss/');
//const socket = new WebSocket('ws://127.0.0.1:8111');
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

    console.log('Received Message');

    try {

        const data = JSON.parse(event.data);
        const username = localStorage.getItem('username');

        if (data.event == 'user_connected' && data.username == username) {

            window.localStorage.setItem('uuid', data.uuid);
 
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('game-container').style.display = '';
        }
        else if (data.event == 'logout') {

            localStorage.setItem('uuid', '');
            localStorage.setItem('username', '');

            location.reload();
        }
        else if (data.event == 'update') {

            renderContent(JSON.stringify(data.payload));
        }
        else if (data.event == 'refresh') {

            refreshResults(JSON.stringify(data.payload));
        }
    }
    catch (e) {
        console.log(e);
    }
});

// 4. Handle errors and disconnection
socket.addEventListener('error', (event) => {
    console.error('WebSocket Error:', event);
    setTimeout(() => {
        location.reload();
    }, 60000);
});

socket.addEventListener('close', () => {
    console.log('Connection closed.');
    setTimeout(() => {
        location.reload();
    }, 60000);
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
    const clave = document.getElementById('clave').value.trim();

    document.getElementById('clave').value = '';
    document.getElementById('serverPassword').value = '';

    if (!password || !clave || !username) {
        return;
    }

    window.localStorage.setItem('username', username);

    // Test payload matching server criteria
    const authPayload = {
        type: 'auth',
        password: password,
        username: username,
        clave: clave
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

function castVote(charIndex, valueIndex) {

    let updatedVotes = [...currentVotes];

    if (valueIndex == updatedVotes[charIndex]) {
        console.log('*ignore*');
        return;
    }

    updatedVotes = updatedVotes.map((x, index) => {

        if ( x == valueIndex ) {

            for (let i=0; i<3; i++) {
    
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn';
            }

            return null;
        }

        if (index === charIndex) {
            for (let i=0; i<3; i++) {
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn op';
            }
        }
        else if (x === null) {
            for (let i=0; i<3; i++) {
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn';
            }
        }
        else {
            for (let i=0; i<3; i++) {
                document.getElementById('vote-' + index + '-' + i).className = 'fmk-btn op';
            }
            document.getElementById('vote-' + index + '-' + x).className = 'fmk-btn';
        }
        return x;
    });
    
    document.getElementById('vote-' + charIndex + '-' + valueIndex).className = 'fmk-btn';
    updatedVotes[charIndex] = valueIndex;

    const nullVotes = updatedVotes.reduce( (acumulator, currentValue, index) => {
        if (currentValue == null) {
            acumulator.push(index);
        }
        return acumulator;
    }, []);

    if ( nullVotes.length === 1 ) {

        const indexToUpdate = nullVotes[0];
        const valueToUpdate = [0, 1, 2].filter( val => !updatedVotes.includes(val) )[0];
        updatedVotes[indexToUpdate] = valueToUpdate;

        for (let i=0; i<3; i++) {
            document.getElementById('vote-' + indexToUpdate + '-' + i).className = 'fmk-btn op';
        }
        document.getElementById('vote-' + indexToUpdate + '-' + valueToUpdate).className = 'fmk-btn';
    }

    currentVotes = [...updatedVotes];

    const uuid = window.localStorage.getItem('uuid');
    const votePayload = {
        type: 'vote',
        uuid: uuid,
        votes: updatedVotes
    };

    // Send payload as a JSON string
    socket.send(JSON.stringify(votePayload));
}

function refreshResults(payload) {

    console.log('*refreshing table*');

    const results = JSON.parse(payload);

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

    results.forEach(res => {

        const tr = document.createElement("tr");

        let rowHTML = `<td><b>${res.player}</b></td>`;

        const sorted = [0, 1, 2].map(charIndex => res.votes.indexOf(charIndex) > -1 ? res.votes.indexOf(charIndex) : null);

        sorted.forEach(charIndex => {
            rowHTML += `<td><div class="icon">${charIndex === null ? '-' : '<img class="icon" src="' + data.characters[charIndex].image + '"/>'}</div></td>`;
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

var currentVotes = [null, null, null];

var data = {};

function renderContent(payload) {

    console.log('Rendering Content');

    data = JSON.parse(payload);

    currentVotes = [null, null, null];
    document.getElementById("roundTitle").textContent = `Round ${data.round}`;

    const gameGrid = document.getElementById("gameGrid");
    gameGrid.replaceChildren();

    gameGrid.style.display = '';
    document.getElementById('nxt-btn').style.display = 'none';

    data.characters.forEach((char, charIndex) => {

        const col = document.createElement("div");

        col.className = 'character-column';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'img-container';

        const image = new Image();
        image.src = char.image;
        image.alt = char.name;

        imageContainer.appendChild(image);
        col.appendChild(imageContainer);

        const titleContainer = document.createElement("div");
        titleContainer.className = 'info-box title';

        const titleButton = document.createElement("button");
        titleButton.textContent = char.name;
        titleButton.className = 'linkedin';
        titleButton.dataset.name = char.name;
        titleButton.dataset.sourceName = char.sourceName;
        titleButton.alt = char.name;
        titleButton.title = char.name;
        titleButton.addEventListener('click', function (event) {
            const keyWord = event.target.dataset.name.replace(/"([^"]*)"/g, '').replace(/[^a-zA-Z0-9]/g, " ").trim(); 
            googlemethis(encodeURIComponent( keyWord + ' fanservice') );
        });
        titleContainer.appendChild(titleButton);
        col.appendChild(titleContainer);

        const subTitleContainer = document.createElement("div");
        subTitleContainer.className = 'info-box subtitle';

        const subTitleButton = document.createElement("button");
        subTitleButton.textContent = char.sourceName;
        subTitleButton.alt = char.sourceName;
        subTitleButton.title = char.sourceName;
        subTitleButton.className = 'linkedin';
        subTitleButton.dataset.sourceURL = char.sourceURL;
        subTitleButton.addEventListener('click', function (event) {
            window.open(event.target.dataset.sourceURL, '_new');
        });
        subTitleContainer.appendChild(subTitleButton);
        col.appendChild(subTitleContainer);

        const buttonGroup = document.createElement("div");
        buttonGroup.className = 'button-group';

        voteValues.forEach((label, valueIndex) => {

            const button = document.createElement("button");

            button.dataset.charIndex = charIndex;
            button.dataset.valueIndex = valueIndex;

            button.textContent = label;
            button.id = 'vote-' + charIndex + '-' + valueIndex;
            button.className = 'fmk-btn';
            button.addEventListener('click', function (event) {
                castVote(parseInt(event.target.dataset.charIndex + '', 10), parseInt(event.target.dataset.valueIndex + '', 10));
            });

            buttonGroup.appendChild(button);
        });

        col.appendChild(buttonGroup);
        gameGrid.appendChild(col);
    });
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
