# Términos canónicos — PagaJusto v1

El esquema estricto compartido (`packages/shared/src/index.ts`) define el contenido aceptable. La API comprueba además el checksum de ambas wallets. Rechaza claves adicionales, otra red/activo, importes inválidos, wallets iguales, índices no secuenciales o un presupuesto que no coincida con la suma de los hitos.

El hash es `SHA-256(UTF8(canonicalJson(terms)))`, hexadecimal minúsculo de 64 caracteres. No se usa el hash facilitado por el navegador.

Reglas de serialización propias, no una implementación general de RFC 8785:

- Objetos simples: claves ordenadas lexicográficamente por unidades UTF-16 de JavaScript (`sort()`). Todos los nombres del esquema son ASCII.
- Arrays: conservan su orden, incluidos hitos y criterios.
- Cadenas, booleanos y null: escape de `JSON.stringify`, sin espacios extra.
- Números: solo enteros seguros para versión, índices y plazos. El dinero es siempre una cadena decimal de stroops; sin signo, exponente o ceros iniciales.
- No se aceptan `undefined`, fechas como objetos, `bigint` dentro del JSON, NaN, Infinity ni números fraccionarios. Las fechas son cadenas UTC ISO 8601 terminadas en `Z`.
- Las cadenas se recortan al validar el esquema. Después de validar, no se modifica el contenido. No hay normalización Unicode implícita.

Ejemplo: `{ "z": [{ "c": 1, "a": "Perú" }], "a": true }` se convierte en `{"a":true,"z":[{"a":"Perú","c":1}]}`.

El detalle del acuerdo permite ver el texto canónico exacto y su hash. `createdAt` forma parte de los términos; los timestamps del índice no. El contrato recibe solamente hash, versión, participantes, presupuesto, importes de hitos y límite de ajustes. No recibe conversaciones, archivos, criterios ni URLs.

Los términos son inmutables en esta primera etapa. Para modificarlos se crea un nuevo acuerdo/contrato, con nuevas aceptaciones de ambas partes. No hay editor que cambie términos aceptados en segundo plano.

La huella de un archivo debe calcularse sobre sus bytes. Una huella de URL solo identifica el texto del enlace, no su contenido ni la calidad del trabajo. La API no descarga URLs arbitrarias.
