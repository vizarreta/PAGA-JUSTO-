# API PagaJusto

Esta carpeta corresponde al backend previo, trasladado a `apps/api`.

Consulta el [README principal](../../README.md) para instalación reproducible, el [estado real de implementación](../../docs/implementation-status.md) y la [arquitectura](../../docs/architecture.md).

Comandos desde esta carpeta: `npm ci`, `npm run generate`, `npm run db:migrate`, `npm run build`, `npm start`.

La API usa `.env` de esta carpeta. No sobrescribir un archivo existente. La configuración de ejemplo apunta a PostgreSQL local de Docker Compose. Las transiciones financieras que antes actualizaban únicamente PostgreSQL fueron retiradas; sus endpoints fallan explícitamente hasta integrar firmas y reconciliación Soroban. La demo del contrato real se ejecuta desde `scripts/testnet-demo.cjs` en la raíz.
