document.addEventListener('DOMContentLoaded', function() {

    let registrarse = document.getElementById('registrarse');
    registrarse.addEventListener('click', async function(event) {
        event.preventDefault();

        let nombre = document.getElementById('nombre').value.trim();
        let email = document.getElementById('email').value.trim();
        let contrasena = document.getElementById('contraseña').value.trim();
        let confirmar = document.getElementById('confirmar-contraseña').value.trim();
        let errorEl = document.getElementById('error-registro');

        if (nombre === '' || email === '' || contrasena === '') {
            errorEl.textContent = 'Por favor rellena todos los campos.';
            return;
        }

        if (contrasena !== confirmar) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        if (contrasena.length < 6) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        const ok = await RegistrarUsuario(nombre, email, contrasena);
        if (ok) {
            alert('Registro exitoso. Ahora puedes iniciar sesión.');
            document.location.href = 'inicio_sesion.html';
        }
    });
});