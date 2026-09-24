# Versiones y fuentes consultadas

Fecha de verificación: 24/09/2026. Se conservaron versiones del código previo cuando compilaron correctamente; no se hizo una actualización general de librerías.

| Componente | Versión fijada / verificada |
|---|---|
| Node requerido | >=22.12.0 por Stellar SDK; ejecución local 24.14.1 |
| Rust | 1.93.0 |
| Soroban SDK | 25.3.2, versión existente comprobada en índice oficial Cargo; MSRV 1.91.0 |
| Stellar SDK API | 17.1.0; APIs comprobadas en declaraciones/código instalado y Testnet |
| Freighter API | 6.0.1; `getAddress`, `getNetworkDetails`, `signMessage` con `address` |
| React / Vite / Tailwind | Versiones exactas del lock trasladado; ver `apps/web/package.json` |
| NestJS / Prisma | Versiones exactas del lock trasladado; Prisma 6.19.3; ver `apps/api/package.json` |
| Zod / TypeScript | 3.25.76 / 5.9.3 |

Fuentes primarias:

- [Preparación del entorno Stellar y wasm32v1-none](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup).
- [SDK Soroban](https://github.com/stellar/rs-soroban-sdk) y [registro oficial de versiones](https://index.crates.io/so/ro/soroban-sdk). Se inspeccionó el código de `Env::register`, `register_at`, macros y almacenamiento de la versión descargada.
- [Firmas Freighter](https://docs.freighter.app/extension-freighter-api/signing) y [SEP-53 con vector de prueba](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0053.md).
- [SDK JavaScript Stellar](https://github.com/stellar/js-stellar-sdk). Se contrastaron `Operation.createCustomContract` y sus `constructorArgs`, `prepareTransaction`, `getTransaction`, `simulateTransaction`, `getAssetBalance` y tipos ScVal con la versión instalada; la ejecución real verifica el recorrido.
- [Almacenamiento y TTL](https://developers.stellar.org/docs/build/guides/storage/storage-strategies) y [archivado/restauración](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival).

Los archivos `package-lock.json` se conservan en raíz, `apps/api`, `apps/web` y `packages/shared`. Cargo conserva `Cargo.lock`. `npm ci`/`cargo --locked` son los comandos reproducibles.
