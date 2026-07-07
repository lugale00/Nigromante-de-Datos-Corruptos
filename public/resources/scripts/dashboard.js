document.addEventListener('DOMContentLoaded', function() {
    verificarSesionAdmin();
    document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);
});

function verificarSesionAdmin() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/admin/verificar", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                let datos = JSON.parse(xhr.responseText);
                document.getElementById('admin-nombre').textContent = '⚰ ' + datos.nombre;
                cargarDashboard();
            } else {
                // No es admin, redirigimos al menú
                document.location.href = 'menu.html';
            }
        }
    };
    xhr.send();
}

function cerrarSesion() {
    document.location.href = 'menu.html';
}

function cargarDashboard() {
    cargarStatsUsuarios();
    cargarStatsMisiones();
    cargarStatsActividad();

    // ✅ Listeners de búsqueda
    document.getElementById('btn-buscar').addEventListener('click', function() {
        let busqueda = document.getElementById('busqueda').value.trim();
        cargarStatsUsuarios(busqueda);
    });

    document.getElementById('btn-limpiar').addEventListener('click', function() {
        document.getElementById('busqueda').value = '';
        cargarStatsUsuarios();
    });

    // ✅ Buscar al pulsar Enter
    document.getElementById('busqueda').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            let busqueda = document.getElementById('busqueda').value.trim();
            cargarStatsUsuarios(busqueda);
        }
    });
}

function cargarStatsUsuarios(busqueda = '') {
    let xhr = new XMLHttpRequest();
    let url = '/game/admin/stats/usuarios';
    if (busqueda) url += `?busqueda=${encodeURIComponent(busqueda)}`;

    xhr.open("GET", url, true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);
            renderizarTablaEstudiantes(datos, busqueda);
            if (!busqueda) {
                renderizarGraficaNiveles(datos);
                renderizarResumen(datos);
            }
        }
    };
    xhr.send();
}

function cargarStatsMisiones() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/admin/stats/misiones", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);
            renderizarGraficaMisiones(datos);
        }
    };
    xhr.send();
}

function cargarStatsActividad() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/game/admin/stats/intentos", true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let datos = JSON.parse(xhr.responseText);
            renderizarGraficaActividad(datos);
        }
    };
    xhr.send();
}

function renderizarTablaEstudiantes(usuarios, busqueda = '') {
    let tbody = document.getElementById('tabla-estudiantes-body');
    let info = document.getElementById('tabla-info');
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">No se encontraron estudiantes.</td></tr>';
        info.textContent = 'Sin resultados';
        return;
    }

    usuarios.forEach(u => {
        let tasa = u.total_intentos > 0
            ? Math.round(u.aciertos * 100 / u.total_intentos)
            : 0;
        let fecha = new Date(u.fecha_registro).toLocaleDateString('es-ES');

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.nombre}</td>
            <td>${u.email || '—'}</td>
            <td>${u.nivel_actual}</td>
            <td>${u.nivel_maximo}</td>
            <td>${u.total_intentos || 0}</td>
            <td>${u.aciertos || 0}</td>
            <td>${u.fallos || 0}</td>
            <td>${tasa}%</td>
            <td>${fecha}</td>
            <td><button onclick="promoverUsuario('${u.nombre}')">Promover</button></td>
        `;
        tbody.appendChild(tr);
    });

    info.textContent = busqueda
        ? `${usuarios.length} resultado(s) para "${busqueda}"`
        : `Mostrando los ${usuarios.length} últimos registros`;
}

function renderizarTablaEstudiantes(usuarios) {
    let tbody = document.getElementById('tabla-estudiantes-body');
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        let tasa = u.total_intentos > 0
            ? Math.round(u.aciertos * 100 / u.total_intentos)
            : 0;
        let fecha = new Date(u.fecha_registro).toLocaleDateString('es-ES');

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.nombre || '—'}</td>
            <td>${u.email || '—'}</td>       
            <td>${u.nivel_actual || 1}</td>
            <td>${u.nivel_maximo || 1}</td>
            <td>${u.total_intentos || 0}</td>
            <td>${u.aciertos || 0}</td>
            <td>${u.fallos || 0}</td>
            <td>${tasa}%</td>
            <td>${fecha}</td>
            <td><button onclick="promoverUsuario('${u.nombre}')">Promover</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarResumen(usuarios) {
    let totalIntentos = usuarios.reduce((s, u) => s + parseInt(u.total_intentos || 0), 0);
    let totalAciertos = usuarios.reduce((s, u) => s + parseInt(u.aciertos || 0), 0);
    let tasaGlobal = totalIntentos > 0 ? Math.round(totalAciertos * 100 / totalIntentos) : 0;

    document.getElementById('total-estudiantes').textContent = usuarios.length;
    document.getElementById('total-intentos').textContent = totalIntentos;
    document.getElementById('tasa-global').textContent = tasaGlobal + '%';
}

function promoverUsuario(nombre) {
    if (!confirm(`¿Seguro que quieres hacer administrador a ${nombre}?`)) return;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/game/admin/promover", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            alert(`${nombre} ahora es administrador.`);
            cargarStatsUsuarios();
        } else if (xhr.readyState == 4) {
            alert('Error al promover usuario.');
        }
    };

    xhr.send(JSON.stringify({ nombre }));
}

function renderizarGraficaNiveles(usuarios) {
    let nivel1 = usuarios.filter(u => u.nivel_actual == 1).length;
    let nivel2 = usuarios.filter(u => u.nivel_actual == 2).length;
    let nivel3 = usuarios.filter(u => u.nivel_actual == 3).length;

    new Chart(document.getElementById('grafica-niveles'), {
        type: 'doughnut',
        data: {
            labels: ['Nivel 1', 'Nivel 2', 'Nivel 3'],
            datasets: [{
                data: [nivel1, nivel2, nivel3],
                backgroundColor: ['#6b3fa0', '#a05a2c', '#2c6ba0']
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { font: { family: 'Pixelify Sans', size: 14 } }
                }
            }
        }
    });
}

function renderizarGraficaMisiones(misiones) {
    // Misión más difícil (menor tasa de acierto con al menos 1 intento)
    let conIntentos = misiones.filter(m => m.total_intentos > 0);
    if (conIntentos.length > 0) {
        let dificil = conIntentos.reduce((min, m) =>
            parseFloat(m.tasa_acierto) < parseFloat(min.tasa_acierto) ? m : min
        );
        document.getElementById('mision-dificil').textContent = dificil.nombre;
    }

    new Chart(document.getElementById('grafica-misiones'), {
        type: 'bar',
        data: {
            labels: misiones.map(m => m.nombre),
            datasets: [{
                label: '% Acierto',
                data: misiones.map(m => parseFloat(m.tasa_acierto) || 0),
                backgroundColor: misiones.map(m =>
                    m.nivel_requerido == 1 ? '#6b3fa0' :
                    m.nivel_requerido == 2 ? '#a05a2c' : '#2c6ba0'
                )
            }]
        },
        options: {
            scales: {
                y: { min: 0, max: 100, ticks: { font: { family: 'Pixelify Sans' } } },
                x: { ticks: { font: { family: 'Pixelify Sans' }, maxRotation: 45 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderizarGraficaActividad(dias) {
    let labels = dias.map(d => new Date(d.dia).toLocaleDateString('es-ES')).reverse();
    let totales = dias.map(d => parseInt(d.total)).reverse();
    let aciertos = dias.map(d => parseInt(d.aciertos)).reverse();

    new Chart(document.getElementById('grafica-actividad'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Intentos totales',
                    data: totales,
                    borderColor: '#6b3fa0',
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Aciertos',
                    data: aciertos,
                    borderColor: '#2c6ba0',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                x: { ticks: { font: { family: 'Pixelify Sans' }, maxRotation: 45 } },
                y: { ticks: { font: { family: 'Pixelify Sans' } } }
            },
            plugins: {
                legend: { labels: { font: { family: 'Pixelify Sans', size: 14 } } }
            }
        }
    });
}