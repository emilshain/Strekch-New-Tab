function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const clockText = document.getElementById('clock-text');
    const dateText = document.getElementById('date');
    if (!clockText || !dateText) return;

    clockText.textContent = `${hours}:${minutes}`;
    
    // Format: Wednesday, March 11
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateText.textContent = now.toLocaleDateString('en-US', options).toUpperCase();

    fitClockToScreen();
}

let typedQueryBuffer = '';
let typedQueryResetTimer;

function isEditableTarget(target) {
    if (!target) return false;
    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function updateAddressBarQuery(query) {
    const url = new URL(window.location.href);
    if (query) {
        url.searchParams.set('q', query);
    } else {
        url.searchParams.delete('q');
    }
    history.replaceState(null, '', url.toString());
}

function resetTypedQueryBuffer() {
    typedQueryBuffer = '';
    updateAddressBarQuery('');
}

function scheduleTypedQueryReset() {
    clearTimeout(typedQueryResetTimer);
    typedQueryResetTimer = setTimeout(resetTypedQueryBuffer, 5000);
}

const SHORTCUT_COMMANDS = {
    'c': 'https://chatgpt.com',
    'a': 'https://claude.ai',
    'g': 'https://gemini.google.com',
    'p': 'https://www.perplexity.ai',
    'y': 'https://youtube.com',
    'm': 'https://maps.google.com',
    'l': 'https://linkedin.com',
    'i': 'https://instagram.com'
};

function submitTypedQuery() {
    const finalQuery = typedQueryBuffer.trim().toLowerCase();
    if (!finalQuery) return;

    if (SHORTCUT_COMMANDS[finalQuery]) {
        window.location.href = SHORTCUT_COMMANDS[finalQuery];
    } else {
        // Navigate to search results like omnibox behavior.
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(typedQueryBuffer.trim())}`;
    }
}

function setupTypeToSearch() {
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target)) return;
        
        // Skip if any modifier except Shift is pressed (Shift is used for capital letters/symbols in search)
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (event.key === 'Enter') {
            if (typedQueryBuffer.trim()) {
                event.preventDefault();
                submitTypedQuery();
            }
            return;
        }

        if (event.key === 'Escape') {
            if (typedQueryBuffer) {
                event.preventDefault();
                resetTypedQueryBuffer();
            }
            return;
        }

        if (event.key === 'Backspace') {
            if (typedQueryBuffer) {
                event.preventDefault();
                typedQueryBuffer = typedQueryBuffer.slice(0, -1);
                updateAddressBarQuery(typedQueryBuffer);
                scheduleTypedQueryReset();
            }
            return;
        }

        if (event.key.length === 1) {
            typedQueryBuffer += event.key;
            updateAddressBarQuery(typedQueryBuffer);
            scheduleTypedQueryReset();
        }
    });
}

function setupShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target)) return;

        // Toggle help with Alt + / or ?
        if ((event.altKey && event.key === '/') || (event.key === '?' && !typedQueryBuffer)) {
            event.preventDefault();
            const legend = document.getElementById('shortcuts-legend');
            if (legend) {
                legend.classList.toggle('visible');
            }
            return;
        }
    });
}

function fitClockToScreen() {
    const clock = document.getElementById('clock');
    const clockText = document.getElementById('clock-text');
    if (!clock || !clockText) return;

    // 98% is the "sweet spot" to ensure visible flush edges without overflow
    const margin = 0.98;
    const targetW = window.innerWidth * margin;
    const targetH = window.innerHeight * margin;

    let minWdth = 1;
    let maxWdth = 200;
    
    // 1. Initial Height Fit
    clock.style.fontSize = '100px'; 
    clock.style.fontVariationSettings = "'wdth' 100, 'wght' 400";
    let rect = clockText.getBoundingClientRect();
    let fontSize = 100 * (targetH / (rect.height || 100));
    clock.style.fontSize = fontSize + 'px';

    // 2. Binary Search for ideal Width
    for (let i = 0; i < 15; i++) {
        let testWdth = (minWdth + maxWdth) / 2;
        let testWght = Math.max(10, Math.min(950, testWdth * 5.5));
        clock.style.fontVariationSettings = `'wdth' ${testWdth}, 'wght' ${testWght}`;
        
        rect = clockText.getBoundingClientRect();
        if (rect.width > targetW) {
            maxWdth = testWdth; 
        } else {
            minWdth = testWdth;
        }
    }

    // 3. Apply and Lock-in
    let finalWdth = minWdth;
    let finalWght = Math.max(10, Math.min(950, finalWdth * 5.5));
    clock.style.fontVariationSettings = `'wdth' ${finalWdth}, 'wght' ${finalWght}`;
    
    // Re-verify height after width changes (as width can affect vertical metrics slightly)
    rect = clockText.getBoundingClientRect();
    if (rect.height > targetH) {
        fontSize *= (targetH / rect.height);
        clock.style.fontSize = fontSize + 'px';
    }

    // 4. Absolute Safety Guard
    // Shrink if any scrollbars appear or edges are breached
    for (let j = 0; j < 5; j++) {
        rect = clockText.getBoundingClientRect();
        const overflowV = rect.height > window.innerHeight || document.documentElement.scrollHeight > window.innerHeight;
        const overflowH = rect.width > window.innerWidth || document.documentElement.scrollWidth > window.innerWidth;
        
        if (overflowV || overflowH) {
            fontSize *= 0.98;
            clock.style.fontSize = fontSize + 'px';
        } else {
            break;
        }
    }
}

function getCurrentPositionAsync() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation unavailable'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 15 * 60 * 1000,
        });
    });
}

async function updateTemperatureC() {
    const temperatureText = document.getElementById('temperature-text');
    if (!temperatureText) return;

    try {
        temperatureText.textContent = 'Loading...';
        const position = await getCurrentPositionAsync();
        const { latitude, longitude } = position.coords;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m&temperature_unit=celsius`;
        const response = await fetch(weatherUrl);
        if (!response.ok) {
            throw new Error('Weather request failed');
        }

        const data = await response.json();
        const tempC = data?.current?.temperature_2m;
        if (typeof tempC !== 'number') {
            throw new Error('Missing weather data');
        }

        temperatureText.textContent = `${Math.round(tempC)}°C`;
    } catch {
        temperatureText.textContent = 'Location Off';
    }
}

// Ensure fonts are loaded before first fit
document.fonts.ready.then(() => {
    updateClock();
    updateTemperatureC();
    setupTypeToSearch();
    setupShortcuts();

    setInterval(updateClock, 1000);
    setInterval(updateTemperatureC, 10 * 60 * 1000);
    window.addEventListener('resize', fitClockToScreen);
});
