# Estado verificable — primera entrega

Fecha: 24 de septiembre de 2026. Esta entrega construye la base y verifica el contrato; **el MVP web completo todavía no está terminado**.

| Etapa | Resultado real |
|---|---|
| 1. Inspección y estructura | Código previo trasladado a `apps/web` y `apps/api`, migración previa conservada, MIT conservada. Paquete compartido, locks npm/Cargo y configuración local. |
| 2. Contrato y recorrido económico | Implementado y probado: constructor, aceptaciones, depósito único, tres hitos, ajustes, revisión y cierre bilateral. WASM compilado y demo real ejecutada en Testnet. |
| 3. Frontend y wallets | Corregidas APIs Freighter, red estricta y token HTTP. Frontend compila. Login HTTP con PostgreSQL real y firmas SEP-53 efímeras verificado por Vite. Interacción con extensión del usuario y firma de operaciones Soroban desde la web: pendientes. |
| 4. Hitos y evidencias | Editor manual de 1–3 hitos y términos estrictos implementado. Historial de huellas y ajustes probado en contrato. Registro privado de evidencias con transacciones web: pendiente. |
| 5. IA | Esquema estricto y pruebas de rechazo de salida inválida listos. Proveedor real, herramientas y credencial: pendientes. La interfaz declara creación manual y la API no simula respuestas de IA. |
| 6. Cierre bilateral | Implementado en contrato y ejecutado con saldo real de Testnet. Interfaz conectada para proponer/firmar: pendiente. |
| 7. Seguimiento y avisos | Script guarda hash y sobre firmado antes del envío y permite reconciliar sin repetir. Worker persistente, avisos, recordatorios y TTL automático: pendientes. |
| 8. Verificación y documentación | 20 pruebas Rust, 14 compartidas, 7 de seguridad de API y 6 de acceso web aprobadas; compilación web/API/WASM aprobada. Login HTTP y rechazo de replay concurrente verificados con DB real. Recorrido financiero web de extremo a extremo: pendiente. |

## Evidencia ejecutada

- `npm test`: 14 tests compartidos + 7 tests de seguridad API + 6 tests de acceso web. Las pruebas unitarias API usan almacenamiento en memoria; la comprobación separada siguiente usa PostgreSQL real.
- `npm run test:auth:live -- http://127.0.0.1:5174`: challenge HTTP, rechazo de firma inválida, exactamente un éxito ante dos firmas válidas concurrentes, perfil con JWT, rechazo de reutilización y de acceso sin token. Usa una wallet efímera sin fondos y elimina solo sus registros de prueba. API y web quedaron ejecutándose en 3001 y 5174 durante la corrección del acceso.
- `cargo test --locked -p pagajusto-escrow`: 20 aprobados. El token de pruebas permite inducir fallos y verifica rollback, incluido el segundo envío de un cierre. Es un doble SEP-41, no el SAC real.
- `cargo build --locked -p pagajusto-escrow --target wasm32v1-none --release`: compilado. El SDK emite avisos de deprecación de `events.publish`; no hay fallos de compilación.
- `npm run build`: API, paquete compartido y web compilados.
- `/testnet-proof`: comprobada visualmente en navegador, con registro histórico, hashes reales y aviso de integración pendiente. Esto no verifica el flujo privado de creación/login.
- `node scripts/testnet-demo.cjs`: 10 transacciones confirmadas en Testnet, lecturas de `get_agreement` y saldo real del SAC después de depósito, pago y cierre. No usó una wallet personal.
- Prueba: 100 XLM depositados → 30 pagados / 70 pendientes → cierre de 70 con 50 al freelancer y 20 al cliente. Total final: 80 pagados, 20 devueltos, 0 pendientes. Comisiones separadas.
- Registro completo: `docs/testnet/latest.json`; registro inmutable de la ejecución: `docs/testnet/2026-09-24T12-27-56-981Z.json`.

## Entorno y límites

- Node 24.14.1 y npm 11.11.0 disponibles. Dependencias directas fijadas; se retiró Nest CLI no usado porque su dependencia transitiva requería otro Node. El proyecto usa TypeScript para compilar NestJS.
- Rust 1.93.0 y SDK 25.3.2 instalados para este trabajo en `.tools` usando Ubuntu/WSL; se instalaron compilador C, curl y pkg-config en esa distribución. No se cambió el PATH global.
- Docker Desktop está instalado, pero el motor no respondió. No se ejecutó PostgreSQL en Docker. Se comprobó la conexión a Supabase ya configurada y que las tablas de usuarios/acuerdos/hitos/transacciones/propuestas estaban vacías. Se aplicaron las migraciones de retos de firma y stroops. Se generó un JWT_SECRET local aleatorio en `.env`, excluido de Git, para reemplazar el valor de ejemplo que impedía arrancar la API.
- No se leyó ni imprimió la credencial de IA. La integración de proveedor está pendiente, independientemente de que exista una clave en algún archivo local.
- No se ha probado el login con la extensión Freighter del usuario. Las firmas SEP-53 se verificaron con el vector oficial y claves efímeras en pruebas.
- No se publicó el repositorio, no se envió formulario ni se operó en Mainnet. No se grabó ni publicó video.

## Siguiente recorrido a implementar

1. Verificar la firma de acceso en la extensión Freighter del usuario; el recorrido API/PostgreSQL y replay concurrente ya están comprobados con claves efímeras.
2. Preparar despliegue de una instancia por acuerdo, vinculando en la API el WASM y los términos exactos; firmar con Freighter y validar cuenta/red/XDR.
3. Persistir la intención antes del envío y reconciliar por hash y efectos reales del contrato antes de habilitar saldos/acciones. Manejar desconocido, rechazo y expiración sin reenvíos ciegos.
4. Conectar los endpoints financieros retirando la barrera solo tras esas pruebas.
5. Conectar evidencias, proveedor de IA, registros de herramientas y trabajos/notificaciones idempotentes.
6. Completar prueba con dos sesiones Freighter, revisión de accesibilidad/móvil, grabación del demo y ensayo de pitch.

Los vencimientos nunca liberan dinero; sin acuerdo bilateral el saldo permanece bloqueado. Las transferencias no solicitadas no aumentan el presupuesto y no hay barrido de esos importes en esta versión. Testnet puede reiniciarse; los hashes históricos pueden dejar de estar disponibles.
