export enum WorkflowStep {
  UPLOAD = 'UPLOAD',
  DATA_ENTRY = 'DATA_ENTRY',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED'
}

export interface LiquidationData {
  pregao: string;
  fonteRecurso: string;
  numeroProcesso: string;
  numeroEmpenho: string;
  valorNota: string;
  fornecedor: string;
  notaPagamento: string;
  notaSistema: string;
  dataLiquidacao: string;
  dataVencimento: string;
  ordemAteste: string;
}

export interface DocumentState {
  invoice: File | null;
  commitment: File | null;
}

export interface ExtractionResult {
  pregao?: string;
  fonteRecurso?: string;
  numeroProcesso?: string;
  numeroEmpenho?: string;
  valorNota?: string;
  fornecedor?: string;
}