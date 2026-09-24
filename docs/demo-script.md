# Guion de video demo — separado del pitch

Estado: guion preparado; video sin grabar. La primera entrega permite grabar la prueba del contrato. No presentar como terminado el recorrido web de IA/wallet/pagos.

1. **0:00–0:20. Contexto.** Mostrar PagaJusto, lema y distintivo Testnet. Explicar que son XLM de prueba y que el cliente conserva la decisión de aprobar.
2. **0:20–0:50. Términos.** Mostrar los términos de la ejecución: dos wallets distintas, 100 XLM, tres hitos 30/40/30 y hash. Indicar que son términos de una demo determinista, no generados por IA.
3. **0:50–1:30. Aceptación y depósito.** Ejecutar `npm run demo:testnet` en una nueva ejecución únicamente cuando no haya transacciones inciertas. Mostrar constructor atómico, dos aceptaciones y hash de depósito confirmado.
4. **1:30–2:00. Entrega y pago.** Mostrar entrega de prueba, aprobación firmada por la wallet cliente y lectura del contrato: 30 pagados y 70 pendientes. Abrir transacción en explorador. Separar comisiones.
5. **2:00–2:35. Revisión y cierre.** Mostrar pausa, propuesta del cliente y aceptación del freelancer. Resultado: 80 pagados en total, 20 devueltos, cero pendientes.
6. **2:35–3:00. Evidencia y límites.** Abrir `/testnet-proof`, contrastar hashes y explicar que es un registro histórico. Mostrar las pruebas automatizadas y señalar la integración web/IA pendiente y el bloqueo sin acuerdo bilateral.

Para el demo final del MVP, sustituir los pasos CLI por dos sesiones Freighter operando la web, incluir generación con un proveedor real y su log de herramientas. No grabar una simulación para suplir esos pasos. No mostrar claves privadas, archivos `.env` ni `.local/*.private.json`.
