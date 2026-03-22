
document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarioHeader();
    getTablasDisponibles();
    getMisionActual();

    document.getElementById('modal-cerrar').addEventListener('click', function() {
        document.getElementById('modal-overlay').classList.remove('activo');
    });

    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('activo');
        }
    });

    let enviar = document.getElementById('enviar');
    enviar.addEventListener('click', function(event) {
        event.preventDefault();
        let sentencia = document.getElementById('sentencia').value.trim();

        if (sentencia === '') {
            mostrarError('Escribe una sentencia antes de invocar.');
            return; // ✅ no enviamos nada si está vacío
        }

        getConsulta(sentencia);
    });

    let consultar = document.getElementById('consultar');
    consultar.addEventListener('click', function(event) {
        event.preventDefault();
        let sentencia = document.getElementById('sentencia').value.trim();

        if (sentencia === '') {
            mostrarError('Escribe una sentencia antes de consultar.');
            return;
        }

        getSoloConsulta(sentencia); // ✅ función nueva que no comprueba la misión
    });
});