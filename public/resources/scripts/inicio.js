
document.addEventListener('DOMContentLoaded', function() {

    let iniciar = document.getElementById('iniciar-sesion');
    iniciar.addEventListener('click', async function(event) {
        event.preventDefault();
        let email = document.getElementById('email').value.trim();
        let contrasena = document.getElementById('contraseña').value.trim();

        if (email === '' || contrasena === '') {
            alert('Por favor, ingresa un email y contraseña válidos.');
            return;
        }

        const ok = await ComprobarUsuario(email, contrasena);
        if (ok) {
            document.location.href = 'menu.html';
        }
    });

    let registrarse = document.getElementById('registrarse');
    registrarse.addEventListener('click', function(event) {
        event.preventDefault();
        document.location.href = 'registro.html'; // ✅ redirigimos a la nueva página
    });
});