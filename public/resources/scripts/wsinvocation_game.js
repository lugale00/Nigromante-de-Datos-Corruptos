function getConsulta(sentencia) { // ✅ eliminado parámetro nivel
    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/game/consulta/${sentencia}`, true); // ✅ sin ?nivel=
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            let resultado = JSON.parse(xhr.responseText);
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = '';

            resultado.forEach((tupla, index) => {
                let textarea = document.createElement('textarea');
                textarea.classList.add('resultado');
                textarea.readOnly = true;
                textarea.placeholder = `Fila ${index + 1}`;

                let texto = '';
                for (let campo in tupla) {
                    texto += `${campo}: ${tupla[campo]}\n`;
                }
                textarea.value = texto;
                contenedor.appendChild(textarea);
            });

        }else if (xhr.readyState == 4 && xhr.status == 403) {
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = '';
            let errorMsg = document.createElement('textarea');
            errorMsg.classList.add('resultado');
            errorMsg.style.color = '#ff0015';
            errorMsg.readOnly = true;
            errorMsg.textContent = 'Aún no tienes nivel para esa invocación.';
            contenedor.appendChild(errorMsg);

        } else if (xhr.readyState == 4 && xhr.status == 500) {
            let contenedor = document.getElementById('resultado-container');
            contenedor.innerHTML = '';
            let errorMsg = document.createElement('textarea');
            errorMsg.classList.add('resultado');
            errorMsg.style.color = '#ff0015';
            errorMsg.readOnly = true;
            errorMsg.textContent = 'Error en la runa de invocación.';
            contenedor.appendChild(errorMsg);
        }
    };
    xhr.send();
}
