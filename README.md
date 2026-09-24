# PagaJusto — AI Escrow for Freelancers

**Tu trabajo vale. Tu pago se protege.**

MVP por etapas para freelancers y pequeños negocios de Perú. Exclusivamente **Stellar Testnet y XLM de prueba**. Licencia MIT existente conservada.

Esta entrega incluye un contrato Soroban probado y desplegado en Testnet, una demo económica real con dos wallets, un editor manual, autenticación SEP-53 y la base React/NestJS/Prisma. **La firma de pagos desde la web, la IA real y los recordatorios todavía están pendientes.** Las operaciones incompletas devuelven un error explícito; no confirman dinero en la base de datos.

## Resultado real

El 24/09/2026 se ejecutó: depósito **100 XLM** → pago **30 XLM**, saldo **70 XLM** → cierre bilateral con **50 XLM** adicionales al freelancer y **20 XLM** devueltos al cliente. Saldo final: 0. Las comisiones son independientes.

[Contrato Testnet](https://stellar.expert/explorer/testnet/contract/CCYTNDYEETWXBB5NO6CVQEC75FPESVZUS667OR4GHLCQURFXVUV7E665) · [Registro completo](docs/testnet/latest.json) · [Hashes y reproducción](docs/testnet.md)

La web incluye `/testnet-proof`: muestra el registro histórico de esa ejecución, no saldos consultados en vivo.

## Estructura

```text
apps/web            React + TypeScript + Vite + Tailwind + Freighter
apps/api            NestJS + Prisma + Stellar SDK
contracts/escrow    Rust + Soroban, una instancia por acuerdo
packages/shared     Esquemas estrictos, stroops, JSON canónico
scripts             Demo Testnet y reconciliación de hashes
docs                Arquitectura, resultados, pendientes, demo y pitch
```

El código previo de `frontend`/`backend` se trasladó conservando archivos, migraciones y configuración local. Se corrigieron las rutas de scripts. No se hizo commit ni publicación del repositorio.

## Instalación local

Requisitos: Node >=22.12.0, npm, Docker Desktop con motor activo y Freighter para probar la autenticación. Rust 1.93.0 es necesario para contrato; se usa `wasm32v1-none`.

```sh
npm run install:all
npm run dev:db
```

Configura `apps/api/.env` tomando `apps/api/.env.example`. **Si ya existe, conserva su configuración y selecciona una base local de pruebas antes de aplicar migraciones.** El ejemplo raíz conserva la configuración previa de Supabase. Crea un JWT_SECRET aleatorio de al menos 32 caracteres; los valores de ejemplo son rechazados.

Ejemplo para generar un secreto local, sin guardarlo en Git:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

```sh
npm run db:generate
npm run db:migrate
npm run dev
```

Web: `http://localhost:5173`. API: `http://localhost:3001/api`. El proxy Vite usa ese puerto. Configura `FRONTEND_URL` con la dirección que abrirás en el navegador; aparece en el mensaje de firma. `npm run dev` inicia ambos servicios y detiene el conjunto si uno termina, para no dejar una pantalla de acceso con la API apagada. PostgreSQL Compose escucha solo en `127.0.0.1:5432` y conserva datos en `pg_data`. Redis previo queda bajo un perfil opcional y no es requisito del MVP.

La migración a BIGINT convierte los DECIMAL XLM previos a stroops de forma exacta. Revísala y conserva respaldo antes de aplicarla a una base que ya tenga datos. Durante la corrección del login se comprobó que la base configurada no tenía usuarios ni acuerdos, hitos, transacciones o propuestas; se aplicaron las dos migraciones pendientes sin borrar datos existentes.

Para ver la prueba pública sin backend ni wallet:

```sh
npm run dev:web
```

Abre `http://localhost:5173/testnet-proof`.

## Verificación

```sh
npm test
npm run build
# Con la API y la base configurada disponibles; también acepta la URL de Vite:
npm run test:auth:live -- http://localhost:5173
cargo test --locked -p pagajusto-escrow
cargo build --locked -p pagajusto-escrow --target wasm32v1-none --release
npm run demo:testnet
```

Resultados ejecutados: **20 tests Rust + 14 compartidos + 7 de seguridad API + 6 de acceso web**, compilación de las tres partes TypeScript y WASM, diez transacciones confirmadas de Testnet. El login se comprobó por HTTP a través de Vite con PostgreSQL real y una clave efímera: firma inválida, sesión válida, perfil JWT y rechazo de reutilización concurrente. El script borra únicamente sus registros temporales y no muestra claves ni tokens. Se comprobaron el estado del contrato y el balance SAC después de los movimientos económicos. [Detalle y límites de las pruebas](docs/implementation-status.md).

La demo genera dos wallets nuevas financiadas por Friendbot. Sus claves y XDR de recuperación se guardan en `.local`, ignorado por Git. No usa Freighter ni claves personales. Ante resultado incierto, ejecuta `npm run demo:reconcile` y revisa estado antes de reanudar; no se repiten depósitos automáticamente.

## Reglas implementadas en el contrato

- Constructor atómico y autorizado por el cliente; wallets diferentes; Testnet y SAC nativo fijos.
- Ambas partes aceptan exactamente versión y hash antes del depósito íntegro, permitido una sola vez.
- Uno a tres hitos positivos, suma exacta y orden secuencial.
- Solo freelancer entrega; solo cliente solicita ajustes/aprueba pagos; destinatario fijo y sin pagos duplicados.
- Historial de huellas, fondos conservados al pedir ajustes y pagos pausados durante revisión.
- Propuestas de cierre versionadas; contrapropuesta invalida la anterior; la otra parte autoriza el reparto del saldo exacto.
- Transferencias y estado atómicos, incluyendo rollback si falla el segundo envío de un cierre.
- Contabilidad independiente de transferencias externas y almacenamiento persistente con mantenimiento de TTL.

## Límites y siguiente etapa

El MVP web completo sigue en desarrollo. El login con PostgreSQL está probado mediante firmas SEP-53 efímeras; falta verificar la interacción con la extensión Freighter del usuario. La firma/envío/reconciliación del contrato desde la aplicación todavía no está conectada. Las acciones financieras web permanecen deshabilitadas. La IA informa que está pendiente y permite trabajar en modo manual. Workers, avisos, archivos y recuperación automática de TTL son pendientes.

Sin acuerdo bilateral, los fondos permanecen bloqueados en este MVP. No hay mediación externa ni devolución automática por vencimiento. No hay auditoría de seguridad. No se usan dinero real, Mainnet, USDC, soles, cuentas bancarias, WhatsApp ni reputación.

## Documentación

- [Estado y tareas pendientes](docs/implementation-status.md)
- [Arquitectura y diagrama](docs/architecture.md)
- [Términos, serialización y hash](docs/canonical-terms.md)
- [Despliegue Testnet, recuperación y TTL](docs/testnet.md)
- [Versiones y fuentes oficiales](docs/versions-and-sources.md)
- [Guion de video demo](docs/demo-script.md), pendiente de grabación
- [Pitch de menos de tres minutos](docs/pitch.md), entregable independiente
