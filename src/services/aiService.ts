import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function predictDelay(order: Order, productionStatus: string): Promise<string> {
  try {
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Não foi possível analisar no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro na análise inteligente.";
  }
}
