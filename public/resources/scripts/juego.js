

let nivel = 1;

document.addEventListener('DOMContentLoaded', function() {
    let enviar = document.getElementById('enviar'); 
    enviar.addEventListener('click', function(event) {
        event.preventDefault();
        let sentencia = document.getElementById('sentencia').value;
        sentencia = sentencia.replace("almas", `nivel${nivel}.almas`);
        getConsulta(sentencia);
    });
});
