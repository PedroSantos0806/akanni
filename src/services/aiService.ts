import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAIInstance() {
  if (aiInstance) return aiInstance;
  
  let apiKey = '';
  try {
    apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';
  } catch (e) {
    apiKey = '';
  }
  
  if (!apiKey) {
    return null;
  }
  
  aiInstance = new GoogleGenAI(apiKey);
  return aiInstance;
}

export async function predictDelay(order: Order, productionStatus: string): Promise<string> {
  try {
    const ai = getAIInstance();
    if (!ai) {
      return "Análise indisponível (Chave API não configurada).";
    }

    const prompt = `
      Você é um especialista em produção de vestuário. 
      Analise os seguintes itens do pedido e diga se há alto risco de atraso (Fluxo Akanni):
      ${order.items.map(i => `- ${i.quantity}x ${i.shirtType} (${i.fabricType} ${i.fabricColor})`).join('\n')}
      - Status Atual: ${order.status}
      - Data de Entrega: ${order.deliveryDate}
      - Data de Criação: ${order.createdAt}
      
      Considere que estamos em uma fábrica com fluxo normal. 
      Responda em UMA frase curta e amigável: "Risco Alto" ou "Risco Baixo" seguido de uma breve explicação do porquê.
    `;

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() || "Não foi possível analisar no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro na análise inteligente.";
  }
}
