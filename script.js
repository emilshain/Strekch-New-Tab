function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const clockText = document.getElementById('clock-text');
    const dayText = document.getElementById('day-text');
    const dateTextNew = document.getElementById('date-text-new');
    if (!clockText || !dayText || !dateTextNew) return;

    const hoursElem = document.getElementById('hours-text');
    const minutesElem = document.getElementById('minutes-text');
    if (hoursElem) hoursElem.textContent = hours;
    if (minutesElem) minutesElem.textContent = minutes;
    
    // Day: WEDNESDAY
    const dayOptions = { weekday: 'long' };
    dayText.textContent = now.toLocaleDateString('en-US', dayOptions).toUpperCase();

    // Date: MAR 11
    const dateOptions = { month: 'short', day: 'numeric' };
    dateTextNew.textContent = now.toLocaleDateString('en-US', dateOptions).toUpperCase();

    fitAllCards();
}

function fitTextToContainer(textElement, containerElement, isClock = false) {
    if (!textElement || !containerElement) return;

    // Determine overshoot: Single-line layout allows 28% vertical bleed for edge-to-edge ink.
    // Stacked layout needs to fit strictly within bounds to avoid top/bottom clipping.
    const isStacked = textElement.parentElement && textElement.parentElement.classList.contains('stacked');
    const overshoot = isStacked ? 1.03 : 1.28;
    
    const baseWght = isClock ? 400 : 200;
    
    // Reset styles for measurement
    textElement.style.fontSize = '100px'; 
    textElement.style.fontVariationSettings = `'wdth' 100, 'wght' ${baseWght}`;

    // Relying on CSS padding for margins, so we aim for 100% of inner dimensions
    const targetW = containerElement.clientWidth;
    const targetH = containerElement.clientHeight;

    let minWdth = 1;
    let maxWdth = 800; // Allow extreme stretching to touch the box edges
    
    // 1. Initial Height Fit - with Overshoot
    let rect = textElement.getBoundingClientRect();
    let fontSize = 100 * (targetH / (rect.height || 100)) * overshoot;
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
    if (rect.height > targetH * overshoot) {
        fontSize *= ((targetH * overshoot) / rect.height);
        textElement.style.fontSize = fontSize + 'px';
    }

    // 4. Absolute Safety Guard
    for (let j = 0; j < 5; j++) {
        rect = textElement.getBoundingClientRect();
        const overflowV = rect.height > containerElement.clientHeight * overshoot;
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
    const clockSection = document.getElementById('clock-section');
    const clock = document.getElementById('clock');
    
    if (clockSection && clock) {
        const container = document.querySelector('.container');
        const windowRatio = window.innerWidth / window.innerHeight;
        
        // Full layout shift to vertical stack at 85:100 ratio
        if (windowRatio < 0.85) {
            container.classList.add('mobile-stacked');
        } else {
            container.classList.remove('mobile-stacked');
        }

        // Clock section stacking logic (950:630 threshold)
        if (windowRatio < (95 / 63)) {
            clock.classList.add('stacked');
        } else {
            clock.classList.remove('stacked');
        }
    }

    // Clock always fits to fill its (flexible) card
    fitTextToContainer(document.getElementById('clock-text'), clockSection, true);
    
    // Fit Date Card sections - Now with weight-flexing enabled to fill wide bars
    fitTextToContainer(document.getElementById('day-text'), document.getElementById('day-section'), true);
    fitTextToContainer(document.getElementById('date-text-new'), document.getElementById('date-section'), true);
    
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

    setInterval(updateClock, 1000);
    setInterval(updateTemperatureC, 10 * 60 * 1000);
    window.addEventListener('resize', fitAllCards);
});
