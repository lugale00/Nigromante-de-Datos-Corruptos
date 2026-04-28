
function ComprobarUsuario(email, contrasena) {
    return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/game/user/login", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(true);
                } else {
                    let error = JSON.parse(xhr.responseText);
                    alert(error.error || 'Error al iniciar sesión.');
                    resolve(false);
                }
            }
        };

        xhr.send(JSON.stringify({ email, contrasena }));
    });
}

function RegistrarUsuario(nombre, email, contrasena) {
    return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/game/user/registrar", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(true);
                } else {
                    let error = JSON.parse(xhr.responseText);
                    alert(error.error || 'Error al registrarse.');
                    resolve(false);
                }
            }
        };

        xhr.send(JSON.stringify({ nombre, email, contrasena }));
    });
}

function cargarUsuarioHeader() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/sesion", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let sesion = JSON.parse(xhr.responseText);
            let header = document.querySelector('header');

            let info = document.createElement('div');
            info.id = 'usuario-info';
            info.innerHTML = `
                <span id="usuario-nombre">⚰ ${sesion.nombre}</span>
                <span id="usuario-nivel">Nivel ${sesion.nivel}</span>
            `;
            header.appendChild(info);

            // ✅ cambiamos el enemigo según el nivel al cargar la página
            if (typeof cambiarEnemigo === 'function') {
                cambiarEnemigo(sesion.nivel);
            }
        }
    };
    xhr.send();
}

function cargarUsuarioHeader_menu() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/sesion", true);
    xhr.withCredentials = true; // ✅

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let sesion = JSON.parse(xhr.responseText);
            let header = document.querySelector('header');

            let info = document.createElement('div');
            info.id = 'usuario-info';
            info.innerHTML = `
                <span id="usuario-nombre">⚰ ${sesion.nombre}</span>
            `;
            header.appendChild(info);
        }
    };
    xhr.send();
}

function cargarMenu() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/sesion", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let sesion = JSON.parse(xhr.responseText);
            let btnContinuar = document.getElementById('continuar');
            btnContinuar.textContent = `Continuar: Nivel ${sesion.nivel}`;

            // ✅ Mostramos el botón de dashboard solo si es admin
            if (sesion.rol === 'admin') {
                let btnDashboard = document.getElementById('dashboard');
                if (btnDashboard) btnDashboard.style.display = 'block';
            }

        } else if (xhr.readyState == 4 && xhr.status == 401) {
            document.location.href = 'inicio_sesion.html';
        }
    };
    xhr.send();
}

function nuevoJuego() {
    return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/game/nuevoJuego", true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                resolve(true);
            } else if (xhr.readyState == 4) {
                resolve(false);
            }
        };
        xhr.send();
    });
}