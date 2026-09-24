export function jwtSecret(value: string | undefined): string {
  if (!value || value.length < 32 || /change|cambia|tu-super|example/i.test(value))
    throw new Error('Configura JWT_SECRET con al menos 32 caracteres aleatorios.');
  return value;
}
