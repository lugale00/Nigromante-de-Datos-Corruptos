function getConsulta(sentencia) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${sentencia}`, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resultado = JSON.parse(xhr.responseText);
            console.log(resultado);
        }
    };
    xhr.send();
}
