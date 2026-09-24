import { stroopsToXlm as decimalXlm, xlmToStroops } from '@pagajusto/shared';
export { xlmToStroops };
export function formatXLM(stroops: string | bigint): string { return `${decimalXlm(stroops)} XLM`; }
export const formatXLMShort = formatXLM;
export const stroopsToXlm = formatXLM;
