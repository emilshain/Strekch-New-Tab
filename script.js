function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const clockText = document.getElementById('clock-text');
    const dayText = document.getElementById('day-text');
    const dateTextNew = document.getElementById('date-text-new');
    if (!clockText || !dayText || !dateTextNew) return;

    clockText.textContent = `${hours}:${minutes}`;
    
    // Day: WEDNESDAY
    const dayOptions = { weekday: 'long' };
    dayText.textContent = now.toLocaleDateString('en-US', dayOptions).toUpperCase();

    // Date: MAR 11
    const dateOptions = { month: 'short', day: 'numeric' };
    dateTextNew.textContent = now.toLocaleDateString('en-US', dateOptions).toUpperCase();

    fitAllCards();
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

function fitTextToContainer(textElement, containerElement, isClock = false) {
    if (!textElement || !containerElement) return;

    const baseWght = isClock ? 400 : 200;
    
    // Reset styles for measurement
    textElement.style.fontSize = '100px'; 
    textElement.style.fontVariationSettings = `'wdth' 100, 'wght' ${baseWght}`;

    // Relying on CSS padding (8px) for margins, so we aim for 100% of inner dimensions
    const targetW = containerElement.clientWidth;
    const targetH = containerElement.clientHeight;

    let minWdth = 1;
    let maxWdth = 800; // Allow extreme stretching to touch the box edges
    
    // 1. Initial Height Fit - 28% Overshoot
    let rect = textElement.getBoundingClientRect();
    let fontSize = 100 * (targetH / (rect.height || 100)) * 1.28;
    textElement.style.fontSize = fontSize + 'px';

    // 2. Binary Search for ideal Width
    for (let i = 0; i < 15; i++) {
        let testWdth = (minWdth + maxWdth) / 2;
        let testWght = isClock ? Math.max(10, Math.min(950, testWdth * 5.5)) : 200;
        textElement.style.fontVariationSettings = `'wdth' ${testWdth}, 'wght' ${testWght}`;
        
        rect = textElement.getBoundingClientRect();
        if (rect.width > targetW) {
            maxWdth = testWdth; 
        } else {
            minWdth = testWdth;
        }
    }

    // 3. Apply and Lock-in
    let finalWdth = minWdth;
    let finalWght = isClock ? Math.max(10, Math.min(950, finalWdth * 5.5)) : 200;
    textElement.style.fontVariationSettings = `'wdth' ${finalWdth}, 'wght' ${finalWght}`;
    
    rect = textElement.getBoundingClientRect();
    if (rect.height > targetH * 1.28) {
        fontSize *= ((targetH * 1.28) / rect.height);
        textElement.style.fontSize = fontSize + 'px';
    }

    // 4. Absolute Safety Guard - Allow 28% vertical overflow for edge-to-edge ink
    for (let j = 0; j < 5; j++) {
        rect = textElement.getBoundingClientRect();
        const overflowV = rect.height > containerElement.clientHeight * 1.28;
        const overflowH = rect.width > containerElement.clientWidth;
        
        if (overflowV || overflowH) {
            fontSize *= 0.98;
            textElement.style.fontSize = fontSize + 'px';
        } else {
            break;
        }
    }
}

function fitAllCards() {
    // Clock always fits to fill its (flexible) card
    fitTextToContainer(document.getElementById('clock-text'), document.getElementById('clock-section'), true);
    
    // Fit Date Card sections
    fitTextToContainer(document.getElementById('day-text'), document.getElementById('day-section'), false);
    fitTextToContainer(document.getElementById('date-text-new'), document.getElementById('date-section'), false);
    
    // Fit Temperature Card - Now with weight-flexing enabled
    fitTextToContainer(document.getElementById('temperature-text'), document.getElementById('temp-section'), true);
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
        fitAllCards();
    } catch {
        temperatureText.textContent = 'Location Off';
        fitAllCards();
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
    window.addEventListener('resize', fitAllCards);
});
