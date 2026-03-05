function getConsulta(sentencia) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${sentencia}`, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resultado = JSON.parse(xhr.responseText);
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = ''; // Limpiamos resultados anteriores

            resultado.forEach((tupla, index) => {
                let textarea = document.createElement('textarea');
                textarea.classList.add('resultado');
                textarea.readOnly = true;
                textarea.placeholder = `Fila ${index + 1}`;

                // Construimos el texto de cada tupla
                let texto = '';
                for (let campo in tupla) {
                    texto += `${campo}: ${tupla[campo]}\n`;
                }
                textarea.value = texto;

                contenedor.appendChild(textarea);
            });
        }
    };
    xhr.send();
}
