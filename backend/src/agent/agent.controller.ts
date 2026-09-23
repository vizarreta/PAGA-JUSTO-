import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  @Post('draft')
  async draftAgreement(@Body() data: {
    naturalLanguage: string;
    clientAddress: string;
    freelancerAddress: string;
  }) {
    // Stub implementation - returns questions for manual mode
    return {
      terms: {
        version: 1,
        title: 'Acuerdo manual',
        description: data.naturalLanguage,
        network: 'testnet',
        asset: { code: 'XLM', contractId: '' },
        totalBudgetStroops: '0',
        clientAddress: data.clientAddress,
        freelancerAddress: data.freelancerAddress,
        milestones: [],
        reviewPeriodHours: 48,
        revisionRounds: 2,
        clientMaterials: [],
        scopeIncluded: [],
        scopeExcluded: [],
        resolutionPolicy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      questions: [
        '¿Cuál es el presupuesto total en XLM?',
        '¿En cuántas etapas (hitos) se divide el trabajo? (máx. 3)',
        '¿Cuál es el título y descripción de cada hito?',
        '¿Cuáles son los criterios de aceptación para cada hito?',
        '¿Qué materiales debe proporcionar el cliente y cuándo?',
        '¿Qué está incluido y qué está excluido del alcance?',
        '¿Cuál es el plazo de revisión por hito (horas)?',
        '¿Cuántas rondas de ajustes se incluyen?',
      ],
      warnings: ['IA no configurada. Complete el acuerdo manualmente.'],
    };
  }

  @Post('summarize-evidence')
  async summarizeEvidence(@Body() data: {
    agreementId: string;
    milestoneIndex: number;
    evidenceDescription: string;
  }) {
    return {
      summary: 'Resumen generado por IA (pendiente de implementación)',
      matchesCriteria: [],
    };
  }

  @Get('agreement/:agreementId/status')
  async getAgreementStatus(@Param('agreementId') agreementId: string) {
    return { status: 'ok', agreementId };
  }

  @Post('notify')
  async notifyParties(@Body() data: {
    agreementId: string;
    type: string;
    title: string;
    message: string;
  }) {
    return { notified: true };
  }

  @Post('prepare-action')
  async prepareAction(@Body() data: {
    agreementId: string;
    actionType: string;
    params: Record<string, any>;
  }) {
    return {
      action: data.actionType,
      requiresSignature: true,
      details: data.params,
    };
  }
}