import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
         // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const extractDataFromDocuments = async (
  invoice: File | null, 
  commitment: File | null
): Promise<ExtractionResult> => {
  if (!invoice && !commitment) {
    throw new Error("Nenhum documento fornecido para análise.");
  }

  const parts = [];
  if (invoice) parts.push(await fileToGenerativePart(invoice));
  if (commitment) parts.push(await fileToGenerativePart(commitment));

  const prompt = `
    Analise as imagens fornecidas (Nota Fiscal e/ou Nota de Empenho).
    Extraia as seguintes informações se estiverem visíveis:
    - Número do Pregão
    - Fonte de Recurso
    - Número do Processo Administrativo
    - Número do Empenho
    - Valor Total da Nota
    - Nome do Fornecedor

    Responda APENAS com um objeto JSON. Se um campo não for encontrado, deixe-o como string vazia ou null.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [...parts, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pregao: { type: Type.STRING },
            fonteRecurso: { type: Type.STRING },
            numeroProcesso: { type: Type.STRING },
            numeroEmpenho: { type: Type.STRING },
            valorNota: { type: Type.STRING },
            fornecedor: { type: Type.STRING },
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractionResult;
    }
    return {};
  } catch (error) {
    console.error("Erro na extração de dados:", error);
    throw new Error("Falha ao extrair dados dos documentos.");
  }
};