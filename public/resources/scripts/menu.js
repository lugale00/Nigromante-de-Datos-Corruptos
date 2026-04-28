
document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarioHeader_menu();
    cargarMenu();

    let continuar = document.getElementById('continuar');
    continuar.addEventListener('click', function() {
        document.location.href = 'game.html';
    });

    let nuevoJuegoBtn = document.getElementById('nuevo-juego');
    nuevoJuegoBtn.addEventListener('click', async function() {
        const ok = await nuevoJuego();
        if (ok) {
            document.location.href = 'game.html';
        }
    });

    let dashboardBtn = document.getElementById('dashboard');
    dashboardBtn.addEventListener('click', function() {
        document.location.href = 'dashboard.html';
    });
});