// Variable para almacenar la misión actual
let misionActual = null;

// Variable de bloqueo global
let bloqueado = false;

const palabrasSQL = [ // Palabras clave SQL para autocompletado
    // Cláusulas principales
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
    'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL',
    'IS NOT NULL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN','ASC','DESC',
    // Tablas del juego
    'almas', 'lugar', 'armamento',
    // Columnas del juego
    'id', 'nombre', 'nivel', 'corrupcion', 'id_lugar', 'id_alma', 'tipo', 'aumento'
];

// Array de enemigos para futuras animaciones o cambios de imagen
const enemigosPorNivel = {
    1: ['resources/images/enemies/enemigo_fantasma.png'],
    2: [
        'resources/images/enemies/enemigo_araña.png',
        'resources/images/enemies/enemigo_caballo.png',
        'resources/images/enemies/enemigo_fantasma.png'
    ],
    3: ['resources/images/enemies/enemigo_fantasma_lvl2.png'], // tutorial intermedio
    4: [
        'resources/images/enemies/enemigo_araña.png',
        'resources/images/enemies/enemigo_caballo.png',
        'resources/images/enemies/enemigo_fantasma_lvl2.png'
    ],
    5: ['resources/images/enemies/enemigo_rey.png']
};

function getConsulta(sentencia) { // función principal para enviar la consulta al servidor
    if (bloqueado) return;
    setBloqueado(true);

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${encodeURIComponent(sentencia)}`, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resultado = JSON.parse(xhr.responseText);
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = '';

            resultado.forEach((tupla, index) => {
                let textarea = document.createElement('textarea');
                textarea.classList.add('resultado');
                textarea.readOnly = true;
                textarea.placeholder = `Fila ${index + 1}`;

                let texto = '';
                for (let campo in tupla) {
                    texto += `${campo}: ${tupla[campo]}\n`;
                }
                textarea.value = texto;
                contenedor.appendChild(textarea);
            });

            setBloqueado(false);

            if (misionActual) {
                console.log('misionActual:', misionActual); // ← log temporal
                comprobarSolucion(resultado);
            }

            if (enEjercicio) {
                comprobarSolucionTutorial(resultado);
            }
        } else if (xhr.readyState == 4 && xhr.status == 403) {
            setBloqueado(false);
            mostrarError('Aún no tienes nivel para esa invocación.');
            if (!enEjercicio) reducirVidaJugador(); // sin daño en tutorial

        } else if (xhr.readyState == 4 && xhr.status == 418) {
            setBloqueado(false);
            mostrarError('No puedes acceder a ese plano astral.');
            if (!enEjercicio) reducirVidaJugador();

        } else if (xhr.readyState == 4 && xhr.status == 500) {
            setBloqueado(false);
            mostrarError('Error en la runa de invocación.');
            if (!enEjercicio) reducirVidaJugador(); // sin daño en tutorial
        }
    };
    xhr.send();
}

function comprobarSolucion(resultadoJugador) { // función para enviar la solución del jugador al servidor y comprobarla
    if (!misionActual) return; // evitamos enviar si no hay misión activa
    console.log('Enviando a comprobar, idMision:', misionActual.id); // ← log
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/comprobar", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let respuesta = JSON.parse(xhr.responseText);
            if (respuesta.correcto) {
                mostrarExito('¡Invocación correcta! El enemigo recibe el golpe.');
                animarEnemigo(); // animarEnemigo gestiona el bloqueo internamente
                setTimeout(() => getMisionActual(misionActual.id), 800);
            } else {
                mostrarError('Invocación incorrecta. El enemigo contraataca.');
                reducirVidaJugador();
                setBloqueado(false); // desbloqueamos tras el fallo
            }
        }
    };
    // Enviamos la misión actual y el resultado del jugador al servidor para su verificación
    xhr.send(JSON.stringify({
        idMision: misionActual.id,
        resultadoJugador: resultadoJugador
    }));
}

function getMisionActual(idMisionActual = null) { // función para obtener la misión actual del jugador desde el servidor
    console.log('getMisionActual llamada desde:', new Error().stack); // ← log
    let xhr = new XMLHttpRequest();
    let url = `/game/mision`;
    if (idMisionActual) url += `?idMisionActual=${idMisionActual}`;

    xhr.open("GET", url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);
            console.log('getMisionActual respuesta:', datos); // ← log

            if (datos.esTutorial) {
                cambiarAudio('tutorial'); // ✅ música de tutorial
                iniciarTutorial();
                return;
            }

            if (datos.subirNivel) {
                subirNivel();
                return;
            }

            cambiarAudio('batalla');
            misionActual = datos;
            let div = document.getElementById('mision');
            div.innerHTML = `<p>${misionActual.descripcion}</p>`;
        }
    };
    xhr.send();
}

let subiendoNivel = false;

function subirNivel() {
    if (subiendoNivel) return;
    subiendoNivel = true;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/subirNivel", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);

            if (datos.nivelMaximo) {
                mostrarExito('¡Has completado el juego! Eres el maestro nigromante.');
                cambiarEnemigo(5);
                subiendoNivel = false;
                return;
            }

            mostrarExito(`¡Nivel ${datos.nuevoNivel} desbloqueado! Nuevas tablas disponibles.`);
            cambiarEnemigo(datos.nuevoNivel);
            configurarEnemigo(datos.nuevoNivel);

            // ✅ Siempre restauramos la opacidad al subir de nivel
            document.querySelector('.enemigo').style.opacity = '1';
            document.querySelector('.enemigo').style.transition = '';

            let nivelEl = document.getElementById('usuario-nivel');
            if (nivelEl) nivelEl.textContent = `Nivel ${datos.nuevoNivel}`;

            setTimeout(() => {
                subiendoNivel = false;
                getTablasDisponibles();
                getMisionActual();
            }, 2000);
        }
    };
    xhr.send();
}

function mostrarError(mensaje) { // función para mostrar mensajes de error en la interfaz
    let contenedor = document.getElementById('feedback-container');
    contenedor.innerHTML = '';
    let errorMsg = document.createElement('textarea');
    errorMsg.classList.add('resultado');
    errorMsg.style.color = '#ff0015';
    errorMsg.readOnly = true;
    errorMsg.textContent = mensaje;
    contenedor.appendChild(errorMsg);
}

function mostrarExito(mensaje) { // función para mostrar mensajes de éxito en la interfaz
    let contenedor = document.getElementById('feedback-container');
    contenedor.innerHTML = '';
    let msg = document.createElement('textarea');
    msg.classList.add('resultado');
    msg.style.color = '#099709';
    msg.readOnly = true;
    msg.textContent = mensaje;
    contenedor.appendChild(msg);
}

function animarEnemigo() { // función para animar al enemigo cuando recibe un golpe
    setBloqueado(true); // ✅ bloqueamos durante la animación
    let enemigo = document.querySelector('.enemigo-img');
    let nigromante = document.getElementById('jugador-img');

    // ✅ Cambiamos el sprite del nigromante al de ataque
    nigromante.src = 'resources/images/nigromante_attack.png';

    enemigo.classList.add('enemigo-golpeado');

    setTimeout(() => {
        enemigo.classList.remove('enemigo-golpeado');
        reducirVidaEnemigo();
        setBloqueado(false); // ✅ desbloqueamos tras la animación

        // ✅ Restauramos el sprite del nigromante
        nigromante.src = 'resources/images/nigromante.png';
    }, 600);
}

function reducirVidaEnemigo() { // función para reducir la vida del enemigo y comprobar si ha muerto
    let corazones = document.querySelectorAll('.vida-enemigo');
    for (let i = corazones.length - 1; i >= 0; i--) {
        if (!corazones[i].classList.contains('vacio')) {
            corazones[i].src = 'resources/images/corazon_vacio.png'; // cambia la imagen a un corazón vacío
            corazones[i].classList.add('vacio');
            break;
        }
    }

    let llenos = document.querySelectorAll('.vida-enemigo:not(.vacio)');
    if (llenos.length === 0) {
        setTimeout(() => enemigoMuerto(), 500);
    }
}

function aplicarVida(vida) {
    let vidaEl = document.getElementById('jugador-vida');
    if (!vidaEl) return;
    vidaEl.textContent = `Vida: ${vida}`;
    vidaEl.style.background = `linear-gradient(to right, 
        rgba(46, 169, 46, 0.65) ${vida}%, 
        rgba(255, 0, 0, 0.65) ${vida}%)`;
}

function reducirVidaJugador() {
    let vidaEl = document.getElementById('jugador-vida');
    let nigromante = document.getElementById('jugador-img');
    let vidaActual = parseInt(vidaEl.textContent.replace('Vida: ', ''));
    let nuevaVida = Math.max(0, vidaActual - 20);

    aplicarVida(nuevaVida);

    // ✅ Solo actualizamos la sesión del servidor, no la BD
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/vida", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ vida: nuevaVida }));

    nigromante.src = 'resources/images/nigromante_damage.png';
    nigromante.classList.add('nigromante-dañado');
    setTimeout(() => {
        nigromante.src = 'resources/images/nigromante.png';
        nigromante.classList.remove('nigromante-dañado');
    }, 600);

    if (nuevaVida === 0) {
        setTimeout(() => jugadorMuerto(), 500);
    }
}

function enemigoMuerto() { // función para manejar la muerte del enemigo y pasar a la siguiente misión
    let enemigo = document.querySelector('.enemigo');
    enemigo.style.transition = 'opacity 1s';
    enemigo.style.opacity = '0';
    setTimeout(() => siguienteMision(), 1500);
}

async function jugadorMuerto() { // función para manejar la muerte del jugador y reiniciar el juego
    alert('Has sido derrotado. El Rey Corrupto ha ganado esta batalla...');
    const ok = await nuevoJuego(); // resetea el nivel a 1 en BD y sesión
    if (ok) {
        document.location.href = 'menu.html'; // vuelve al menú
    }
}

function getSoloConsulta(sentencia) {
    if (bloqueado) return;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${encodeURIComponent(sentencia)}`, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            document.getElementById('feedback-container').innerHTML = ''; // limpia el error anterior
            let resultado = JSON.parse(xhr.responseText);
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = '';

            resultado.forEach((tupla, index) => {
                let textarea = document.createElement('textarea');
                textarea.classList.add('resultado');
                textarea.readOnly = true;
                textarea.placeholder = `Fila ${index + 1}`;

                let texto = '';
                for (let campo in tupla) {
                    texto += `${campo}: ${tupla[campo]}\n`;
                }
                textarea.value = texto;
                contenedor.appendChild(textarea);
            });

        } else if (xhr.readyState == 4 && xhr.status == 403) { // 403 Forbidden -> nivel insuficiente
            mostrarError('Aún no tienes nivel para esa invocación.');

        } else if (xhr.readyState == 4 && xhr.status == 418) { // 418 I'm a teapot -> intento de acceder donde no debe
            mostrarError('No puedes acceder a ese plano astral.');

        } else if (xhr.readyState == 4 && xhr.status == 500) { // 500 Internal Server Error -> error en la consulta
            mostrarError('Error en la runa de invocación.');
        }
    };
    xhr.send();
}

function siguienteMision() { // función para pasar a la siguiente misión tras derrotar al enemigo
    let nivelEl = document.getElementById('usuario-nivel');
    let nivelActual = nivelEl ? parseInt(nivelEl.textContent.replace('Nivel ', '')) : 1;

    document.getElementById('feedback-container').innerHTML = '';
    document.getElementById('resultado-container').innerHTML = '';
    setBloqueado(false);

    if (nivelActual === 1 || nivelActual === 3) {
        dialogoIndex++;
        mostrarDialogo(dialogoIndex);
        return;
    }

    // ✅ Solo en niveles normales restauramos el enemigo
    document.querySelector('.enemigo').style.opacity = '1';
    document.querySelector('.enemigo').style.transition = '';
    document.querySelectorAll('.vida-enemigo').forEach(c => {
        c.src = 'resources/images/corazon.png';
        c.classList.remove('vacio');
    });
}

function getTablasDisponibles() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/tablas`, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let tablas = JSON.parse(xhr.responseText);
            let lista = document.getElementById('tablas-lista');
            lista.innerHTML = '';

            tablas.forEach(tabla => {
                let li = document.createElement('li');
                let btn = document.createElement('button');
                btn.textContent = tabla.nombre_tabla.charAt(0).toUpperCase()
                                + tabla.nombre_tabla.slice(1);
                btn.addEventListener('click', () => mostrarModal(tabla));
                li.appendChild(btn);
                lista.appendChild(li);
            });
        }
    };
    xhr.send();
}

function mostrarModal(tabla) {
    document.getElementById('modal-titulo').textContent = tabla.nombre_tabla;

    let atributos = document.getElementById('modal-atributos');
    atributos.innerHTML = '';

    let nivelEl = document.getElementById('usuario-nivel');
    let nivelActual = nivelEl ? parseInt(nivelEl.textContent.replace('Nivel ', '')) : 1;

    tabla.atributos.forEach(attr => {
        // Ocultamos atributos que no corresponden al nivel actual
        if (attr.nivel_minimo && attr.nivel_minimo > nivelActual) return;

        let li = document.createElement('li');
        li.textContent = `${attr.nombre}  (${attr.tipo})`;
        if (attr.referencia) {
            li.textContent += ` → ${attr.referencia}`;
        }
        atributos.appendChild(li);
    });

    document.getElementById('modal-overlay').classList.add('activo');
}

function setBloqueado(estado) {
    bloqueado = estado;
    let btnEnviar = document.getElementById('enviar');
    if (btnEnviar) {
        btnEnviar.disabled = estado;
        btnEnviar.style.opacity = estado ? '0.5' : '1';
    }
}

function cambiarEnemigo(nivel) {
    let lista = enemigosPorNivel[nivel];
    let nuevaImg = lista[Math.floor(Math.random() * lista.length)];
    document.querySelector('.enemigo-img').src = nuevaImg;
}

function iniciarAutocompletado() {
    const textarea = document.getElementById('sentencia');
    const sugerencias = document.createElement('div');
    sugerencias.id = 'autocompletado';
    document.body.appendChild(sugerencias);

    textarea.addEventListener('input', function() {
        const texto = textarea.value;
        const posicion = textarea.selectionStart;

        // Obtenemos la palabra actual que se está escribiendo
        const textoHastaCursor = texto.substring(0, posicion);
        const palabraActual = textoHastaCursor.split(/[\s,()]+/).pop();

        if (palabraActual.length < 2) {
            sugerencias.style.display = 'none';
            return;
        }

        // Filtramos las palabras que coinciden
        const coincidencias = palabrasSQL.filter(p =>
            p.toLowerCase().startsWith(palabraActual.toLowerCase()) &&
            p.toLowerCase() !== palabraActual.toLowerCase()
        );

        if (coincidencias.length === 0) {
            sugerencias.style.display = 'none';
            return;
        }

        // Posicionamos el cuadro cerca del textarea
        const rect = textarea.getBoundingClientRect();
        sugerencias.style.left = rect.left + 'px';
        sugerencias.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        sugerencias.style.display = 'block';
        sugerencias.innerHTML = '';

        coincidencias.slice(0, 6).forEach(palabra => {
            let item = document.createElement('div');
            item.classList.add('sugerencia-item');
            item.textContent = palabra;

            item.addEventListener('mousedown', function(e) {
                e.preventDefault(); // evita que el textarea pierda el foco

                // Sustituimos la palabra actual por la sugerencia
                const inicio = textoHastaCursor.lastIndexOf(palabraActual);
                const nuevaConsulta = texto.substring(0, inicio) + palabra + texto.substring(posicion);
                textarea.value = nuevaConsulta;

                // Movemos el cursor al final de la palabra insertada
                const nuevaPosicion = inicio + palabra.length;
                textarea.setSelectionRange(nuevaPosicion, nuevaPosicion);
                textarea.focus();

                sugerencias.style.display = 'none';
            });

            sugerencias.appendChild(item);
        });
    });

    // Ocultamos al perder el foco
    textarea.addEventListener('blur', function() {
        setTimeout(() => sugerencias.style.display = 'none', 150);
    });

    // Ocultamos al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (e.target !== textarea) {
            sugerencias.style.display = 'none';
        }
    });
}

// ============================================
// SISTEMA DE TUTORIAL
// ============================================
let dialogosTutorial = [];

function iniciarTutorial() {
    dialogosTutorial = [];
    dialogoIndex = 0;
    enEjercicio = false;
    tutorialFinalizado = false;
    misionActual = null; // limpiamos la misión anterior

    document.getElementById('mision').innerHTML = '';
    document.getElementById('feedback-container').innerHTML = '';
    document.getElementById('resultado-container').innerHTML = '';

    let nivelEl = document.getElementById('usuario-nivel');
    let nivelActual = nivelEl ? parseInt(nivelEl.textContent.replace('Nivel ', '')) : 1;

    document.querySelector('.enemigo').style.opacity = '1';
    document.querySelector('.enemigo').style.transition = '';

    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/tutorial/dialogos", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            dialogosTutorial = JSON.parse(xhr.responseText);
            mostrarDialogo(0); // ✅ siempre desde el primer diálogo
        }
    };
    xhr.send();
}

function mostrarDialogo(index) {
    if (index >= dialogosTutorial.length) {
        // Tutorial completado, subimos de nivel
        finalizarTutorial();
        return;
    }

    let dialogo = dialogosTutorial[index];
    let overlay = document.getElementById('tutorial-overlay');
    let mensaje = document.getElementById('tutorial-mensaje');
    let nombreEl = document.getElementById('tutorial-fantasma-nombre');
    let btnSiguiente = document.getElementById('tutorial-siguiente');

    // Mostramos el panel
    overlay.classList.add('activo');

    // Actualizamos el fantasma activo
    document.querySelectorAll('.fantasma-tutorial').forEach(f => f.classList.remove('activo'));
    let fantasmaActivo = document.getElementById(`fantasma-${dialogo.fantasma}`);
    if (fantasmaActivo) fantasmaActivo.classList.add('activo');

    // Mostramos el mensaje
    nombreEl.textContent = dialogo.fantasma;
    mensaje.textContent = dialogo.mensaje;

    // Si es ejercicio bloqueamos el siguiente hasta que lo intente
    if (dialogo.tipo === 'ejercicio') {
        overlay.classList.add('ejercicio');
        enEjercicio = true;
        btnSiguiente.textContent = 'Continuar →';
        btnSiguiente.disabled = true;
        btnSiguiente.style.opacity = '0.5';
        // Desbloqueamos el área de escritura
        setBloqueado(false);

        let sentenciaEl = document.getElementById('sentencia');
        sentenciaEl.placeholder = dialogo.pista || 'Escribe tu consulta SQL aquí...';
        sentenciaEl.value = ''; // limpiamos lo que hubiera antes
    } else {
        overlay.classList.remove('ejercicio');
        enEjercicio = false;
        btnSiguiente.textContent = 'Siguiente →';
        btnSiguiente.disabled = false;
        btnSiguiente.style.opacity = '1';
        // Bloqueamos el área de escritura en diálogos
        setBloqueado(true);

         // ✅ Restauramos el placeholder por defecto
        document.getElementById('sentencia').placeholder = 'Escribe tu sentencia SQL aquí...';
    }

    // Guardamos el progreso
    guardarProgresoTutorial(index);
}

function guardarProgresoTutorial(index) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/tutorial/avanzar", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ dialogoActual: index }));
}

let tutorialFinalizado = false;

function finalizarTutorial() {
    if (tutorialFinalizado) return; // ✅ evitamos doble llamada
    tutorialFinalizado = true;

    document.getElementById('tutorial-overlay').classList.remove('activo');
    setBloqueado(false);

    let nivelEl = document.getElementById('usuario-nivel');
    let nivelActual = nivelEl ? parseInt(nivelEl.textContent.replace('Nivel ', '')) : 1;

    document.querySelector('.enemigo').style.opacity = '1';
    document.querySelector('.enemigo').style.transition = '';


    subirNivel();

    // Reseteamos para el siguiente tutorial
    setTimeout(() => { tutorialFinalizado = false; }, 2000);
}

const corazonesPorNivel = {
    1: 1,
    2: 3,
    3: 2,
    4: 3,
    5: 3
};

function configurarEnemigo(nivel) {
    let contenedor = document.getElementById('enemigo-vida');
    contenedor.innerHTML = '';
    let numCorazones = corazonesPorNivel[nivel] || 3;

    for (let i = 0; i < numCorazones; i++) {
        let img = document.createElement('img');
        img.src = 'resources/images/corazon.png';
        img.alt = 'corazón del enemigo';
        img.classList.add('vida-enemigo');
        contenedor.appendChild(img);
    }
}

function normalizarResultadoFrontend(resultado) {
    if (!Array.isArray(resultado)) return resultado;
    return resultado.map(fila => {
        return Object.keys(fila).sort().reduce((obj, key) => {
            obj[key] = String(fila[key]).trim();
            return obj;
        }, {});
    });
}

function comprobarSolucionTutorial(resultadoJugador) {
    let dialogoActual = dialogosTutorial[dialogoIndex];
    let pista = dialogoActual.pista;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${encodeURIComponent(pista)}`, true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resultadoEsperado = JSON.parse(xhr.responseText);
            let jugadorNorm = normalizarResultadoFrontend(resultadoJugador);
            let esperadoNorm = normalizarResultadoFrontend(resultadoEsperado);

            if (JSON.stringify(jugadorNorm) === JSON.stringify(esperadoNorm)) {
                let btnSiguiente = document.getElementById('tutorial-siguiente');
                btnSiguiente.disabled = false;
                btnSiguiente.style.opacity = '1';
                animarEnemigo();
            }
        }
    };
    xhr.send();
}