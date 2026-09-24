import { Controller, Get, Param, Post, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgreementsService } from '../agreements/agreements.service';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agreements: AgreementsService) {}

  @Post('draft')
  draftAgreement() {
    throw new ServiceUnavailableException({ code: 'AI_NOT_CONFIGURED',
      message: 'La IA está pendiente de integración. Puedes crear un acuerdo manual; no se presentará como generado por IA.' });
  }

  @Post('summarize-evidence')
  summarizeEvidence() {
    throw new ServiceUnavailableException('Resumen de IA pendiente de integración. Revisa los criterios y la evidencia original.');
  }

  @Get('agreement/:agreementId/status')
  async getAgreementStatus(@Param('agreementId') id: string, @CurrentUser() user: { address: string }) {
    const row = await this.agreements.getPrivateAgreement(id, user.address);
    return { agreementId: id, databaseStatus: row.status, chainVerified: false,
      message: 'La consulta al contrato desde el agente está pendiente. Este estado es solo del índice.' };
  }

  @Post('notify')
  notifyParties() { throw new ServiceUnavailableException('Avisos persistentes del agente pendientes de implementación.'); }

  @Post('prepare-action')
  prepareAction() { throw new ServiceUnavailableException('Preparación de transacciones para firma pendiente de integración.'); }
}
