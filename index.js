const slider = document.getElementById('volumeSlider');
const output = document.getElementById('volumeOutput');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');


function setPageVolume(level) {
    const gainValue = level / 100.0;

    window.audioContext = window.audioContext || new AudioContext();
    window.gainNode = window.gainNode || window.audioContext.createGain();
    window.elementsConnected = window.elementsConnected || new WeakSet(); 

    if (!window.gainNodeConnected) {
         window.gainNode.connect(window.audioContext.destination);
         window.gainNodeConnected = true; 
    }

    document.querySelectorAll('audio, video').forEach(element => {
        if (window.elementsConnected.has(element)) {
            if (window.gainNode) {
               window.gainNode.gain.value = gainValue;
             }
             return;
         }

        try {
            const source = window.audioContext.createMediaElementSource(element);
            source.connect(window.gainNode);
            window.elementsConnected.add(element); 
            console.log('Volume Amplifier: Conectado elemento', element);
        } catch (error) {
            console.error('Volume Amplifier: Error al conectar elemento', element, error);
        }
    });

    if (window.gainNode) {
        window.gainNode.gain.value = gainValue;
        console.log(`Volume Amplifier: Volumen establecido a ${level}% (${gainValue})`);
    } else {
        console.warn("Volume Amplifier: No se pudo crear el GainNode.");
        return false;
    }
     window.currentVolumeSetting = level;
    return true; 
}

function getPageVolume() {
    return window.currentVolumeSetting || 100; 
}



function updateSliderUI(value) {
    output.textContent = `${value}%`;
    const percentage = (value - slider.min) / (slider.max - slider.min) * 100;
     slider.style.background = `linear-gradient(to right, var(--accent-color), var(--accent-color) ${percentage}%, var(--slider-track) ${percentage}%, var(--slider-track))`;
}

async function applyVolume(value) {
     statusMessage.textContent = 'Aplicando...';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
         if (!tab) {
            throw new Error("No se encontró pestaña activa.");
        }
         if (!tab.url || tab.url.startsWith('chrome://')) {
             statusMessage.textContent = 'No aplicable en esta página.';
             slider.disabled = true;
             resetButton.disabled = true;
             return;
         }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: setPageVolume,
            args: [value],
        });

         if (results && results.length > 0 && results[0].result === true) {
             statusMessage.textContent = 'Volumen aplicado.';
             chrome.storage.sync.set({ currentVolume: value });
         } else {
            statusMessage.textContent = 'Error al aplicar.';
            console.error("Resultado de inyección:", results);
         }


    } catch (error) {
        console.error('Volume Amplifier Error:', error);
        statusMessage.textContent = `Error: ${error.message}`;
    } finally {
       setTimeout(() => { if (statusMessage.textContent === 'Aplicando...' || statusMessage.textContent === 'Volumen aplicado.' || statusMessage.textContent === 'Error al aplicar.') statusMessage.textContent = ''; }, 2000);
    }
}

async function loadInitialVolume() {
    let currentVolume = 100; 

     try {
        const data = await chrome.storage.sync.get('currentVolume');
        if (data.currentVolume) {
            currentVolume = data.currentVolume;
        }
     } catch(e) { console.warn("Error al leer storage", e);}


    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id && (!tab.url || !tab.url.startsWith('chrome://'))) {
             const results = await chrome.scripting.executeScript({
                 target: { tabId: tab.id },
                 func: getPageVolume
             });
             if (results && results.length > 0 && results[0].result) {
                 if (results[0].result !== 100) {
                     currentVolume = results[0].result;
                     console.log("Recuperado volumen desde la pestaña:", currentVolume);
                 }
             }
         }
     } catch (e) { console.warn("No se pudo obtener volumen de la pestaña (puede ser la primera vez)", e);}

     slider.disabled = false;
     resetButton.disabled = false;
    slider.value = currentVolume;
    updateSliderUI(currentVolume);

     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (tab && tab.url && tab.url.startsWith('chrome://')) {
        statusMessage.textContent = 'No aplicable aquí.';
         slider.disabled = true;
         resetButton.disabled = true;
     } else {
         statusMessage.textContent = ''; 
     }
}



slider.addEventListener('input', (event) => {
    const value = parseInt(event.target.value, 10);
    updateSliderUI(value);
    applyVolume(value); 
});

resetButton.addEventListener('click', () => {
    slider.value = 100;
    updateSliderUI(100);
    applyVolume(100);
    statusMessage.textContent = 'Volumen reseteado a 100%';
     setTimeout(() => { if(statusMessage.textContent === 'Volumen reseteado a 100%') statusMessage.textContent = ''; }, 1500);
});


document.addEventListener('DOMContentLoaded', loadInitialVolume);