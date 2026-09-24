# Compilar, desplegar y verificar en Testnet

Requisitos: Node >=22.12, dependencias npm instaladas, Rust 1.93.0 y objetivo `wasm32v1-none`. Rust y Soroban están fijados en `rust-toolchain.toml`, `Cargo.toml` y `Cargo.lock`.

```sh
cargo test --locked -p pagajusto-escrow
cargo build --locked -p pagajusto-escrow --target wasm32v1-none --release
npm run demo:testnet
```

El script utiliza el SDK Stellar 17.1.0: carga WASM, despliega con argumentos de constructor atómicos, obtiene ID real, acepta con ambas wallets, deposita, entrega, paga y cierra bilateralmente. No requiere Stellar CLI. El contrato fijo de XLM se contrasta con `Asset.native().contractId(Networks.TESTNET)` en las pruebas de API. No existe opción Mainnet.

En el entorno Windows de esta entrega, el toolchain local vive en `.tools`. Puede ejecutarse desde PowerShell así:

```powershell
wsl -d Ubuntu --cd 'C:\Users\caerp\Downloads\git hub\PAGA-JUSTO-' -- bash -lc 'export CARGO_HOME="$PWD/.tools/cargo" RUSTUP_HOME="$PWD/.tools/rustup"; .tools/cargo/bin/cargo test --locked -p pagajusto-escrow'
```

Para una instalación nueva utiliza Rust oficial; `.tools` no está versionado. El archivo de bloqueo sí debe conservarse.

## Resultado de esta ejecución

Contrato: `CCYTNDYEETWXBB5NO6CVQEC75FPESVZUS667OR4GHLCQURFXVUV7E665`.

[Ver contrato en Testnet](https://stellar.expert/explorer/testnet/contract/CCYTNDYEETWXBB5NO6CVQEC75FPESVZUS667OR4GHLCQURFXVUV7E665).

| Acción | Transacción |
|---|---|
| Depósito de 100 XLM | [ed5e7baf…](https://stellar.expert/explorer/testnet/tx/ed5e7baff54a3db5f1580ec40e38e8dcbe65d8badc07b1370cba5bd5dab74227) |
| Pago de 30 XLM | [6d29ed5b…](https://stellar.expert/explorer/testnet/tx/6d29ed5bf0a3877acc8f56d755c8d0aa53d12b3112bcd456cdea994400af4189) |
| Cierre del saldo restante | [4509b2a5…](https://stellar.expert/explorer/testnet/tx/4509b2a5b28319a36696b301484e54468e665de2436cd7f031f1ca4f147d4567) |

El registro JSON incluye los diez hashes, ledger de confirmación, fees reales, límite de fee, términos canónicos y tres lecturas del estado. La prueba de 30/70 es un estado histórico intermedio; el contrato está ahora cerrado con 80 pagados y 20 devueltos.

## Desconexión y recuperación

La demo persiste hash y XDR firmado antes de llamar a `sendTransaction`. Solo `SUCCESS` confirma la transacción; además se leen y comprueban estado y balance SAC en los puntos económicos. Error RPC o `NOT_FOUND` no implica que el pago falló.

```sh
npm run demo:reconcile
```

Esto consulta hashes pendientes; no firma ni repite operaciones. Una ejecución incompleta impide iniciar otra automáticamente. Revisar `.local/latest-testnet-run.json`, el contrato y los sobres antes de continuar; la reanudación completa de cada paso no está automatizada aún. Las claves de las wallets creadas para la demo y los sobres quedan en `.local/<ejecución>.private.json`, ignorado por Git. Nunca publicar ese archivo. Son exclusivamente wallets de prueba.

## TTL

`maintain` prolonga estado persistente y código/instancia cuando corresponda; cada acción también lo hace. Las huellas históricas extienden su TTL al leerlas. El mantenimiento tiene coste de red independiente del presupuesto. La lectura por simulación no persiste extensiones: se necesita una invocación enviada y confirmada.

Para estado archivado, simular primero y usar restauración de footprint/entradas archivadas requerida por RPC antes de reintentar el mismo propósito. No desplegar una nueva instancia pensando que la anterior perdió fondos. El worker automático de mantenimiento/restauración todavía está pendiente. Consultar [archivado de estado](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival) y [estrategias de almacenamiento](https://developers.stellar.org/docs/build/guides/storage/storage-strategies).
