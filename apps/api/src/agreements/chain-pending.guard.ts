import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';

/** Stage boundary: legacy DB-only transitions must never impersonate on-chain actions.
 * Remove only when every route prepares wallet signatures and reconciles actual Soroban effects.
 */
@Injectable()
export class ChainPendingGuard implements CanActivate {
  canActivate(): never {
    throw new ServiceUnavailableException({
      code: 'CHAIN_INTEGRATION_PENDING',
      message: 'La firma y reconciliación Soroban desde la aplicación están pendientes. No se ha movido dinero ni cambiado el estado del contrato.',
    });
  }
}
