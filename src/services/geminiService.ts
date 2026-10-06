import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const analyzeTransaction = async (description: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Categoriza la siguiente transacción y sugiere si es Ingreso o Gasto: "${description}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING, enum: ["Ingreso", "Gasto"] },
          categoria: { type: Type.STRING },
          descripcion: { type: Type.STRING }
        },
        required: ["tipo", "categoria", "descripcion"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const extractInvoiceData = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Extrae los datos de TODAS las facturas presentes en este documento. Para cada factura, identifica: monto total, proveedor, fecha y número de factura." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          facturas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                monto: { type: Type.NUMBER },
                proveedor: { type: Type.STRING },
                fecha: { type: Type.STRING },
                numeroFactura: { type: Type.STRING }
              },
              required: ["monto", "proveedor", "fecha", "numeroFactura"]
            }
          }
        },
        required: ["facturas"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateEmailSummary = async (invoices: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Genera un reporte profesional de las siguientes facturas pagadas para enviar por email: ${JSON.stringify(invoices)}`,
    config: {
      systemInstruction: "Eres un asistente contable experto. Redacta reportes claros y profesionales en español."
    }
  });
  return response.text;
};

export const analyzeCashReport = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Extrae el total de ventas de este reporte de cierre de caja." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalVentas: { type: Type.NUMBER }
        },
        required: ["totalVentas"]
      }
    }
  });
  return JSON.parse(response.text);
};
