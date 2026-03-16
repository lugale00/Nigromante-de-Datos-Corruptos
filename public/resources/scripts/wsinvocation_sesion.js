
function ComprobarUsuario(nombre, contrasena) {
    return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/game/user/login", true); // ✅ ruta corregida
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(true);
                } else {
                    alert('Nombre de usuario o contraseña incorrectos.');
                    resolve(false);
                }
            }
        };

        xhr.send(JSON.stringify({ nombre, contrasena }));
    });
}

function RegistrarUsuario(nombre, contrasena) {
    return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/game/user/registrar", true); // ✅ ruta corregida
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(true);
                } else {
                    alert('Error al registrarse. El usuario ya existe.');
                    resolve(false);
                }
            }
        };

        xhr.send(JSON.stringify({ nombre, contrasena }));
    });
}