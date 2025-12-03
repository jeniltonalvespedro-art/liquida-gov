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
  
  // State for accumulated daily batch
  const [dailyBatch, setDailyBatch] = useState<LiquidationData[]>([]);

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
      
      // Add current liquidation to daily batch
      setDailyBatch(prev => [...prev, data]);
      
      // Simulate Liquidation API call
      setTimeout(() => {
        setStep(WorkflowStep.COMPLETED);
      }, 500);
    }
  };

  const handleBack = () => {
    if (step === WorkflowStep.DATA_ENTRY) setStep(WorkflowStep.UPLOAD);
    if (step === WorkflowStep.REVIEW) setStep(WorkflowStep.DATA_ENTRY);
    if (step === WorkflowStep.DAILY_BATCH) setStep(WorkflowStep.COMPLETED);
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

  // Helper to calculate total value
  const calculateTotal = () => {
    return dailyBatch.reduce((acc, item) => {
      // Basic cleaning for Brazilian format string to float
      const valString = item.valorNota.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      const val = parseFloat(valString) || 0;
      return acc + val;
    }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const finalizeDailyBatch = () => {
    if (dailyBatch.length === 0) {
        alert("Não há itens na remessa.");
        return;
    }

    // Prompt user for email address
    const emailDestino = window.prompt("Digite o endereço de e-mail do Setor de Pagamentos (Gmail):", "financeiro.pagamentos@gmail.com");

    if (!emailDestino) return; // User cancelled

    const totalValue = calculateTotal();
    const dateStr = new Date().toLocaleDateString('pt-BR');

    // Build plain text body for email
    let emailBody = `Prezados,\n\nSegue a remessa diária de notas fiscais liquidadas em ${dateStr} para processamento de pagamento:\n\n`;

    dailyBatch.forEach((item, index) => {
        emailBody += `ITEM ${index + 1}:\n`;
        emailBody += `NP: ${item.notaPagamento} | NS: ${item.notaSistema}\n`;
        emailBody += `Processo: ${item.numeroProcesso}\n`;
        emailBody += `Fornecedor: ${item.fornecedor}\n`;
        emailBody += `Valor: ${item.valorNota}\n`;
        emailBody += `Vencimento: ${item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}\n`;
        emailBody += `Ordem Ateste: ${item.ordemAteste}\n`;
        emailBody += `--------------------------------------------------\n`;
    });

    emailBody += `\nTOTAL DA REMESSA: ${totalValue}\n\n`;
    emailBody += `Atenciosamente,\nSetor de Liquidação - LiquidaGov`;

    // Encode parameters
    const subject = encodeURIComponent(`Remessa de Pagamento - ${dateStr}`);
    const body = encodeURIComponent(emailBody);
    
    // Open default mail client
    window.location.href = `mailto:${emailDestino}?subject=${subject}&body=${body}`;

    // Optionally clear batch after sending
    setTimeout(() => {
        const confirmClear = window.confirm("O seu cliente de e-mail deve ter sido aberto. Deseja marcar esta remessa como ENVIADA e limpar a lista?");
        if (confirmClear) {
            setDailyBatch([]);
            resetFlow();
        }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => step === WorkflowStep.DAILY_BATCH && resetFlow()}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">L</div>
            <h1 className="text-xl font-bold text-slate-800">LiquidaGov</h1>
          </div>
          <div className="flex items-center space-x-4">
             {dailyBatch.length > 0 && step !== WorkflowStep.DAILY_BATCH && (
                 <button 
                    onClick={() => setStep(WorkflowStep.DAILY_BATCH)}
                    className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium hover:bg-blue-100 transition-colors"
                 >
                    Remessa Atual: {dailyBatch.length} nota(s)
                 </button>
             )}
            <div className="text-sm text-slate-500 hidden sm:block">
              Setor Financeiro
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          
          {/* Progress Bar - Hide in Daily Batch view */}
          {step !== WorkflowStep.DAILY_BATCH && (
            <div className="bg-slate-50 border-b border-slate-200">
              <StepIndicator currentStep={step} />
            </div>
          )}

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

            {/* Step 4: Completed (Single Item) */}
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
                  <p><strong>Nota Pagamento (NP):</strong> {data.notaPagamento}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200 text-center text-slate-500 italic">
                    Adicionado à Remessa Diária ({dailyBatch.length} itens na fila).
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      onClick={resetFlow}
                      className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Liquidar Nova Nota
                    </button>
                    <button 
                      onClick={() => setStep(WorkflowStep.DAILY_BATCH)}
                      className="inline-flex justify-center items-center px-6 py-3 border border-slate-300 text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      Visualizar Remessa Diária
                    </button>
                </div>
              </div>
            )}

            {/* Step 5: Daily Batch Report */}
            {step === WorkflowStep.DAILY_BATCH && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Remessa Diária para Pagamento</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-200">
                            {new Date().toLocaleDateString('pt-BR')}
                        </span>
                    </div>

                    <p className="text-slate-600 mb-6">
                        Confira abaixo as notas liquidadas hoje para encaminhamento ao Setor de Pagamentos.
                    </p>

                    {dailyBatch.length > 0 ? (
                        <>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm mb-6">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">NP</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Processo</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fornecedor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimento</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {dailyBatch.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.notaPagamento}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.numeroProcesso}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 max-w-xs truncate">{item.fornecedor}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">{item.valorNota}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50">
                                        <tr>
                                            <td colSpan={4} className="px-6 py-3 text-right text-sm font-bold text-slate-900">TOTAL DA REMESSA:</td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">{calculateTotal()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => resetFlow()}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                                >
                                    Adicionar mais notas
                                </button>
                                <button
                                    onClick={finalizeDailyBatch}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Enviar para Setor de Pagamentos
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
                            <p className="text-slate-500">Nenhuma nota liquidada hoje ainda.</p>
                            <button 
                                onClick={resetFlow} 
                                className="mt-4 text-blue-600 font-medium hover:underline"
                            >
                                Iniciar nova liquidação
                            </button>
                        </div>
                    )}
                </div>
            )}

          </div>

          {/* Footer Actions (Standard Flow) */}
          {step !== WorkflowStep.COMPLETED && step !== WorkflowStep.DAILY_BATCH && (
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