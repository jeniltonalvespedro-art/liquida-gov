import React, { useState } from 'react';
import { WorkflowStep, LiquidationData, DocumentState } from './types';
import { StepIndicator } from './components/StepIndicator';
import { FileUploader } from './components/FileUploader';
import { extractDataFromDocuments } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<WorkflowStep>(WorkflowStep.UPLOAD);
  const [docs, setDocs] = useState<DocumentState>({ invoice: null, commitment: null });
  
  // Initialize with today's date for liquidation date
  const today = new Date().toISOString().split('T')[0];
  
  const [data, setData] = useState<LiquidationData>({
    pregao: '',
    fonteRecurso: '',
    numeroProcesso: '',
    numeroEmpenho: '',
    valorNota: '',
    fornecedor: '',
    notaPagamento: '',
    notaSistema: '',
    dataLiquidacao: today,
    dataVencimento: '',
    ordemAteste: ''
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [sicafChecked, setSicafChecked] = useState(false);

  const handleNext = async () => {
    if (step === WorkflowStep.UPLOAD) {
      if (!docs.invoice && !docs.commitment) {
        alert("Por favor, anexe pelo menos um documento.");
        return;
      }
      
      // AI Extraction logic
      if (docs.invoice || docs.commitment) {
        setIsExtracting(true);
        try {
            const result = await extractDataFromDocuments(docs.invoice, docs.commitment);
            setData(prev => ({
              ...prev,
              pregao: result.pregao || prev.pregao,
              fonteRecurso: result.fonteRecurso || prev.fonteRecurso,
              numeroProcesso: result.numeroProcesso || prev.numeroProcesso,
              numeroEmpenho: result.numeroEmpenho || prev.numeroEmpenho,
              valorNota: result.valorNota || prev.valorNota,
              fornecedor: result.fornecedor || prev.fornecedor,
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsExtracting(false);
            setStep(WorkflowStep.DATA_ENTRY);
        }
      } else {
          setStep(WorkflowStep.DATA_ENTRY);
      }
    } else if (step === WorkflowStep.DATA_ENTRY) {
      if (!data.numeroEmpenho || !data.valorNota) {
        alert("Preencha os dados obrigatórios.");
        return;
      }
      setStep(WorkflowStep.REVIEW);
    } else if (step === WorkflowStep.REVIEW) {
      if (!sicafChecked) {
        alert("A verificação do SICAF é obrigatória para prosseguir.");
        return;
      }
      if (!data.notaPagamento || !data.notaSistema || !data.dataLiquidacao || !data.dataVencimento || !data.ordemAteste) {
        alert("Por favor, preencha todos os dados da liquidação (Ordem do Ateste, NP, NS e datas).");
        return;
      }
      // Simulate Liquidation API call
      setTimeout(() => {
        setStep(WorkflowStep.COMPLETED);
      }, 1000);
    }
  };

  const handleBack = () => {
    if (step === WorkflowStep.DATA_ENTRY) setStep(WorkflowStep.UPLOAD);
    if (step === WorkflowStep.REVIEW) setStep(WorkflowStep.DATA_ENTRY);
  };

  const resetFlow = () => {
    setDocs({ invoice: null, commitment: null });
    setData({
      pregao: '',
      fonteRecurso: '',
      numeroProcesso: '',
      numeroEmpenho: '',
      valorNota: '',
      fornecedor: '',
      notaPagamento: '',
      notaSistema: '',
      dataLiquidacao: new Date().toISOString().split('T')[0],
      dataVencimento: '',
      ordemAteste: ''
    });
    setSicafChecked(false);
    setStep(WorkflowStep.UPLOAD);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">L</div>
            <h1 className="text-xl font-bold text-slate-800">LiquidaGov</h1>
          </div>
          <div className="text-sm text-slate-500">
            Setor Financeiro
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          
          {/* Progress Bar */}
          <div className="bg-slate-50 border-b border-slate-200">
            <StepIndicator currentStep={step} />
          </div>

          <div className="p-6 sm:p-8">
            {/* Step 1: Upload */}
            {step === WorkflowStep.UPLOAD && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Digitalização de Documentos</h2>
                <p className="text-slate-600 mb-8">Faça o upload da Nota Fiscal e da Nota de Empenho para iniciar o processo de liquidação.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploader 
                    label="Nota Fiscal (NF)" 
                    file={docs.invoice} 
                    onFileChange={(f) => setDocs(prev => ({ ...prev, invoice: f }))}
                    icon={
                      <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />
                  <FileUploader 
                    label="Nota de Empenho" 
                    file={docs.commitment} 
                    onFileChange={(f) => setDocs(prev => ({ ...prev, commitment: f }))}
                    icon={
                      <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                </div>
                
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    O sistema utilizará Inteligência Artificial para tentar ler automaticamente os dados dos documentos anexados (imagens funcionam melhor).
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Data Entry */}
            {step === WorkflowStep.DATA_ENTRY && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Dados Orçamentários</h2>
                <p className="text-slate-600 mb-6">Confira os dados extraídos e preencha as informações faltantes.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor</label>
                    <input 
                      type="text" 
                      value={data.fornecedor}
                      onChange={e => setData({...data, fornecedor: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="Nome da Empresa LTDA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número do Empenho</label>
                    <input 
                      type="text" 
                      value={data.numeroEmpenho}
                      onChange={e => setData({...data, numeroEmpenho: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="2024NE000123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Nota (R$)</label>
                    <input 
                      type="text" 
                      value={data.valorNota}
                      onChange={e => setData({...data, valorNota: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pregão / Dispensa</label>
                    <input 
                      type="text" 
                      value={data.pregao}
                      onChange={e => setData({...data, pregao: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="PE 15/2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Processo Administrativo</label>
                    <input 
                      type="text" 
                      value={data.numeroProcesso}
                      onChange={e => setData({...data, numeroProcesso: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="23000.000000/2024-00"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fonte de Recurso</label>
                    <input 
                      type="text" 
                      value={data.fonteRecurso}
                      onChange={e => setData({...data, fonteRecurso: e.target.value})}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                      placeholder="1500 - Recursos Ordinários"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Liquidate */}
            {step === WorkflowStep.REVIEW && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Liquidação da Despesa</h2>
                <p className="text-slate-600 mb-6">Valide a regularidade fiscal e gere os dados de liquidação.</p>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Empenho:</span>
                    <span className="font-medium text-slate-900">{data.numeroEmpenho}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Valor:</span>
                    <span className="font-medium text-slate-900">{data.valorNota}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Fornecedor:</span>
                    <span className="font-medium text-slate-900">{data.fornecedor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Processo:</span>
                    <span className="font-medium text-slate-900">{data.numeroProcesso}</span>
                  </div>
                </div>

                <div className="bg-white border-l-4 border-yellow-400 p-4 mb-6 shadow-sm">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Verificação SICAF</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    O sistema consultou a base do SICAF (simulado). Confirme se a certidão está válida.
                  </p>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sicafChecked}
                      onChange={(e) => setSicafChecked(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-slate-700 font-medium">
                      Confirmo que o fornecedor está REGULAR no SICAF e autorizo a liquidação.
                    </span>
                  </label>
                </div>

                {sicafChecked && (
                  <div className="animate-fade-in mt-6 border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Dados Gerados da Liquidação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ordem do Ateste no Processo</label>
                        <input 
                          type="text" 
                          value={data.ordemAteste}
                          onChange={e => setData({...data, ordemAteste: e.target.value})}
                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                          placeholder="Ex: Fls. 15-16"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nota de Pagamento (NP)</label>
                        <input 
                          type="text" 
                          value={data.notaPagamento}
                          onChange={e => setData({...data, notaPagamento: e.target.value})}
                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                          placeholder="2024NP001234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nota de Sistema (NS)</label>
                        <input 
                          type="text" 
                          value={data.notaSistema}
                          onChange={e => setData({...data, notaSistema: e.target.value})}
                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                          placeholder="2024NS000567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data de Liquidação</label>
                        <input 
                          type="date" 
                          value={data.dataLiquidacao}
                          onChange={e => setData({...data, dataLiquidacao: e.target.value})}
                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento para Pagamento</label>
                        <input 
                          type="date" 
                          value={data.dataVencimento}
                          onChange={e => setData({...data, dataVencimento: e.target.value})}
                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-black"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Completed */}
            {step === WorkflowStep.COMPLETED && (
              <div className="text-center py-12 animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Liquidação Realizada!</h2>
                <div className="text-slate-600 mb-8 max-w-lg mx-auto bg-slate-50 p-6 rounded-lg border border-slate-200 text-left space-y-2 text-sm">
                  <p><strong>Processo:</strong> {data.numeroProcesso}</p>
                  <p><strong>Ordem Ateste:</strong> {data.ordemAteste}</p>
                  <p><strong>Nota Pagamento (NP):</strong> {data.notaPagamento}</p>
                  <p><strong>Nota Sistema (NS):</strong> {data.notaSistema}</p>
                  <p><strong>Vencimento:</strong> {data.dataVencimento ? new Date(data.dataVencimento).toLocaleDateString('pt-BR') : '-'}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200 text-center text-slate-500 italic">
                    Encaminhado para o setor de pagamentos.
                  </div>
                </div>
                <button 
                  onClick={resetFlow}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Liquidar Nova Nota
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {step !== WorkflowStep.COMPLETED && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              {step !== WorkflowStep.UPLOAD ? (
                <button 
                  onClick={handleBack}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
                >
                  Voltar
                </button>
              ) : (
                <div></div> /* Spacer */
              )}
              
              <button 
                onClick={handleNext}
                disabled={isExtracting}
                className={`flex items-center px-6 py-2 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all
                  ${isExtracting ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
              >
                {isExtracting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando IA...
                  </>
                ) : (
                  <>
                    {step === WorkflowStep.REVIEW ? 'Confirmar e Liquidar' : 'Próximo'}
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;