
document.addEventListener('DOMContentLoaded', function() {

    let iniciar = document.getElementById('iniciar-sesion');
    iniciar.addEventListener('click', async function(event) {
        event.preventDefault();
        let nombre = document.getElementById('nombre').value;
        let contrasena = document.getElementById('contraseña').value;

        if (nombre.trim() === '' || contrasena.trim() === '') {
            alert('Por favor, ingresa un nombre y contraseña válidos.');
            return;
        }

        const ok = await ComprobarUsuario(nombre, contrasena);
        if (ok) {
            document.location.href = 'menu.html?user=' + encodeURIComponent(nombre);
        }
    });

    let registrarse = document.getElementById('registrarse');
    registrarse.addEventListener('click', async function(event) {
        event.preventDefault();
        let nombre = document.getElementById('nombre').value;
        let contrasena = document.getElementById('contraseña').value;

        if (nombre.trim() === '' || contrasena.trim() === '') {
            alert('Por favor, ingresa un nombre y contraseña válidos.');
            return;
        }

        const ok = await RegistrarUsuario(nombre, contrasena);
        if (ok) {
            alert('Registro exitoso. Ahora puedes iniciar sesión.');
        }
    });
});
