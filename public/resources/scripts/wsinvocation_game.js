// Variable para almacenar la misión actual
let misionActual = null;

// Variable de bloqueo global
let bloqueado = false;

function getConsulta(sentencia) {
    if (bloqueado) return; // ✅ ignoramos si está bloqueado
    setBloqueado(true);    // ✅ bloqueamos mientras se procesa

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

            setBloqueado(false); // ✅ desbloqueamos al terminar si no hay comprobación
            if (misionActual) {
                comprobarSolucion(resultado);
            }

        } else if (xhr.readyState == 4 && xhr.status == 403) { // 403 Forbidden -> nivel insuficiente
            setBloqueado(false); // ✅ desbloqueamos siempre en error
            mostrarError('Aún no tienes nivel para esa invocación.');
            reducirVidaJugador();

        } else if (xhr.readyState == 4 && xhr.status == 418) { // 418 I'm a teapot -> intento de acceder donde no debe
            setBloqueado(false); // ✅ desbloqueamos siempre en error
            mostrarError('No puedes acceder a ese plano astral.');
            reducirVidaJugador();

        } else if (xhr.readyState == 4 && xhr.status == 500) { // 500 Internal Server Error -> error en la consulta
            setBloqueado(false); // ✅ desbloqueamos siempre en error
            mostrarError('Error en la runa de invocación.');
            reducirVidaJugador();
        }
    };
    xhr.send();
}

function comprobarSolucion(resultadoJugador) {
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
                setBloqueado(false); // ✅ desbloqueamos tras el fallo
            }
        }
    };

    xhr.send(JSON.stringify({
        idMision: misionActual.id,
        resultadoJugador: resultadoJugador
    }));
}

function getMisionActual(idMisionActual = null) {
    let xhr = new XMLHttpRequest();
    let url = `/game/mision`;
    if (idMisionActual) url += `?idMisionActual=${idMisionActual}`;

    xhr.open("GET", url, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);

            if (datos.subirNivel) {
                subirNivel();
                return;
            }

            misionActual = datos;
            let div = document.getElementById('mision');
            div.innerHTML = `<p>${misionActual.descripcion}</p>`;
        }
    };
    xhr.send();
}

function subirNivel() {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/subirNivel", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);

            if (datos.nivelMaximo) {
                mostrarExito('¡Has completado el juego! Eres el maestro nigromante.');
                return;
            }

            mostrarExito(`¡Nivel ${datos.nuevoNivel} desbloqueado! Nuevas tablas disponibles.`);

            let nivelEl = document.getElementById('usuario-nivel');
            if (nivelEl) nivelEl.textContent = `Nivel ${datos.nuevoNivel}`;

            setTimeout(() => {
                getTablasDisponibles();
                getMisionActual();
            }, 2000);
        }
    };
    xhr.send();
}

function mostrarError(mensaje) {
    let contenedor = document.getElementById('feedback-container');
    contenedor.innerHTML = '';
    let errorMsg = document.createElement('textarea');
    errorMsg.classList.add('resultado');
    errorMsg.style.color = '#ff0015';
    errorMsg.readOnly = true;
    errorMsg.textContent = mensaje;
    contenedor.appendChild(errorMsg);
}

function mostrarExito(mensaje) {
    let contenedor = document.getElementById('feedback-container');
    contenedor.innerHTML = '';
    let msg = document.createElement('textarea');
    msg.classList.add('resultado');
    msg.style.color = '#099709';
    msg.readOnly = true;
    msg.textContent = mensaje;
    contenedor.appendChild(msg);
}

function animarEnemigo() {
    setBloqueado(true); // ✅ bloqueamos durante la animación
    let enemigo = document.querySelector('.enemigo-img');
    enemigo.classList.add('enemigo-golpeado');

    setTimeout(() => {
        enemigo.classList.remove('enemigo-golpeado');
        reducirVidaEnemigo();
        setBloqueado(false); // ✅ desbloqueamos tras la animación
    }, 600);
}

function reducirVidaEnemigo() {
    let corazones = document.querySelectorAll('.vida-enemigo');
    for (let i = corazones.length - 1; i >= 0; i--) {
        if (!corazones[i].classList.contains('oculto')) {
            corazones[i].classList.add('oculto');
            break;
        }
    }

    let visibles = document.querySelectorAll('.vida-enemigo:not(.oculto)');
    if (visibles.length === 0) {
        setTimeout(() => enemigoMuerto(), 500);
    }
}

function reducirVidaJugador() {
    let vidaEl = document.getElementById('jugador-vida');
    let vidaActual = parseInt(vidaEl.textContent.replace('Vida: ', ''));
    let nuevaVida = Math.max(0, vidaActual - 20);
    vidaEl.textContent = `Vida: ${nuevaVida}`;

    vidaEl.style.background = `linear-gradient(to right, 
        rgba(46, 169, 46, 0.65) ${nuevaVida}%, 
        rgba(255, 0, 0, 0.65) ${nuevaVida}%)`;

    if (nuevaVida === 0) {
        setTimeout(() => jugadorMuerto(), 500);
    }
}

function enemigoMuerto() {
    let enemigo = document.querySelector('.enemigo');
    enemigo.style.opacity = '0';
    enemigo.style.transition = 'opacity 1s';
    setTimeout(() => siguienteMision(), 1500);
}

function jugadorMuerto() {
    alert('Has sido derrotado. Inténtalo de nuevo.');
    location.reload();
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

function siguienteMision() {
    document.querySelector('.enemigo').style.opacity = '1';
    document.querySelector('.enemigo').style.transition = '';
    document.querySelectorAll('.vida-enemigo').forEach(c => c.classList.remove('oculto'));
    document.getElementById('feedback-container').innerHTML = '';
    document.getElementById('resultado-container').innerHTML = '';
    setBloqueado(false); // ✅ desbloqueamos al resetear
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