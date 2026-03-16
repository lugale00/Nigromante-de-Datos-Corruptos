
document.addEventListener('DOMContentLoaded', function() {
    let enviar = document.getElementById('enviar'); 
    enviar.addEventListener('click', function(event) {
        event.preventDefault();
        let sentencia = document.getElementById('sentencia').value;

        // Añadimos el esquema datos automáticamente
        sentencia = sentencia.replace(/\balmas\b/gi, 'datos.almas');
        sentencia = sentencia.replace(/\blugar\b/gi, 'datos.lugar');
        sentencia = sentencia.replace(/\barmamento\b/gi, 'datos.armamento');

        getConsulta(sentencia);
    });
});