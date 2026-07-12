// ============================================
// SISTEMA DE AUDIO
// ============================================
const CANCIONES = {
    menu:     'resources/sounds/lesiakower-waiting-time-175800.mp3',
    tutorial: 'resources/sounds/kaden_cook-8-bit-dungeon-251388.mp3',
    batalla:  'resources/sounds/djartmusic-my-8-bit-hero-301280.mp3'
};

let audioActual = null;

function iniciarAudio(tipo) {
    let src = CANCIONES[tipo];

    if (audioActual && audioActual.src.includes(src) && !audioActual.paused) {
        aplicarSilencio(); // ✅ aplicamos el estado de silencio al cargar la página
        return;
    }

    if (audioActual) {
        sessionStorage.setItem('audio_src', '');
        audioActual.pause();
        audioActual = null;
    }

    let tiempoGuardado = 0;
    let srcGuardado = sessionStorage.getItem('audio_src');
    if (srcGuardado && srcGuardado === src) {
        tiempoGuardado = parseFloat(sessionStorage.getItem('audio_time') || 0);
    }

    audioActual = new Audio(src);
    audioActual.loop = true;
    audioActual.volume = silenciado ? 0 : 0.4; // ✅ respetamos el estado de silencio
    audioActual.currentTime = tiempoGuardado;

    audioActual.play().catch(() => {
        document.addEventListener('click', function iniciarConClick() {
            audioActual.play();
            document.removeEventListener('click', iniciarConClick);
        }, { once: true });
    });

    setInterval(() => {
        if (audioActual && !audioActual.paused) {
            sessionStorage.setItem('audio_src', src);
            sessionStorage.setItem('audio_time', audioActual.currentTime);
        }
    }, 1000);

    aplicarSilencio(); // ✅ aplicamos el icono correcto al cargar
}

function cambiarAudio(tipo) {
    let src = CANCIONES[tipo];
    if (audioActual && audioActual.src.includes(src)) return; // ya suena esta

    sessionStorage.setItem('audio_src', '');
    sessionStorage.setItem('audio_time', '0');

    if (audioActual) {
        audioActual.pause();
        audioActual = null;
    }

    iniciarAudio(tipo);
}

// ============================================
// CONTROL DE SILENCIO
// ============================================
let silenciado = sessionStorage.getItem('audio_silenciado') === 'true';

function toggleAudio() {
    silenciado = !silenciado;
    sessionStorage.setItem('audio_silenciado', silenciado);
    aplicarSilencio();
}

function aplicarSilencio() {
    let icono = document.getElementById('icono-audio');
    if (!icono) return;

    if (silenciado) {
        if (audioActual) audioActual.volume = 0;
        icono.src = 'resources/images/nota_tachada.png';
        icono.alt = 'Música silenciada';
    } else {
        if (audioActual) audioActual.volume = 0.4;
        icono.src = 'resources/images/nota.png';
        icono.alt = 'Música activa';
    }
}