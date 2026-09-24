export function StageNotice() {
  return <div className="card border-accent/40" role="status">
    <strong>Integración de pagos en curso</strong>
    <p className="text-text-secondary mt-1">Este acuerdo es un registro privado. Los saldos, aceptaciones y pagos todavía no se verifican con Soroban desde la web. Las acciones financieras están deshabilitadas hasta completar esa integración.</p>
  </div>;
}
