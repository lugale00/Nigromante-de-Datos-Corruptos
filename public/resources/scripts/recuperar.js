
document.addEventListener('DOMContentLoaded', function() {

    let emailGuardado = '';

    document.getElementById('btn-enviar-codigo').addEventListener('click', async function() {
        let email = document.getElementById('email').value.trim();
        let errorEl = document.getElementById('error-email');

        if (!email) {
            errorEl.textContent = 'Introduce tu correo electrónico.';
            return;
        }

        this.disabled = true;
        this.textContent = 'Enviando...';

        try {
            let res = await fetch('/game/user/recuperar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            let datos = await res.json();

            if (res.ok) {
                emailGuardado = email;
                document.getElementById('paso-email').style.display = 'none';
                document.getElementById('paso-codigo').style.display = 'block';
            } else {
                errorEl.textContent = datos.error || 'Error al enviar el código.';
                this.disabled = false;
                this.textContent = 'Enviar código';
            }
        } catch (e) {
            errorEl.textContent = 'Error de conexión.';
            this.disabled = false;
            this.textContent = 'Enviar código';
        }
    });

    document.getElementById('btn-verificar').addEventListener('click', async function() {
        let codigo = document.getElementById('codigo').value.trim();
        let nuevaContrasena = document.getElementById('nueva-contrasena').value;
        let confirmar = document.getElementById('confirmar-contrasena').value;
        let errorEl = document.getElementById('error-codigo');

        if (!codigo || !nuevaContrasena) {
            errorEl.textContent = 'Rellena todos los campos.';
            return;
        }

        if (nuevaContrasena !== confirmar) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        if (nuevaContrasena.length < 6) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        try {
            let res = await fetch('/game/user/verificar-recuperacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailGuardado,
                    codigo,
                    nuevaContrasena
                })
            });
            let datos = await res.json();

            if (res.ok) {
                alert('Contraseña cambiada correctamente. Ahora puedes iniciar sesión.');
                window.location.href = 'inicio_sesion.html';
            } else {
                errorEl.textContent = datos.error || 'Error al verificar el código.';
            }
        } catch (e) {
            errorEl.textContent = 'Error de conexión.';
        }
    });

    document.getElementById('btn-reenviar').addEventListener('click', function() {
        document.getElementById('paso-codigo').style.display = 'none';
        document.getElementById('paso-email').style.display = 'block';
        document.getElementById('btn-enviar-codigo').disabled = false;
        document.getElementById('btn-enviar-codigo').textContent = 'Enviar código';
    });
});