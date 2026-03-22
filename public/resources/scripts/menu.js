
document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarioHeader_menu();
    cargarMenu(); // ✅ carga el nivel en el botón continuar

    let continuar = document.getElementById('continuar');
    continuar.addEventListener('click', function() {
        document.location.href = 'game.html';
    });

    let nuevoJuegoBtn = document.getElementById('nuevo-juego');
    nuevoJuegoBtn.addEventListener('click', async function() {
        const ok = await nuevoJuego(); // ✅ resetea el nivel a 1 en BD y sesión
        if (ok) {
            document.location.href = 'game.html';
        }
    });
});