import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN?.trim();
  const FOCUS_ENV = (process.env.FOCUS_NFE_ENVIRONMENT || 'sandbox').trim();
  const BASE_URL = FOCUS_ENV === 'production' 
    ? 'https://api.focusnfe.com.br' 
    : 'https://homologacao.focusnfe.com.br';

  console.log(`[FocusNFe] Configured for ${FOCUS_ENV} environment.`);

  // API Route for NF-e Emission
  app.post("/api/nfe/emit", async (req, res) => {
    try {
      if (!FOCUS_TOKEN || FOCUS_TOKEN === "") {
        return res.status(500).json({ error: "FocusNFe Token não configurado ou vazio no Secrets." });
      }

      const { order, issuer } = req.body;
      
      // Mapping Akanni Order to FocusNFe NFS-e format
      const totalValue = order.items.reduce((acc: number, i: any) => acc + (i.quantity * 85), 0);
      const itemsDescription = order.items.map((i: any) => `${i.quantity}x ${i.shirtType} (${i.fabricType} - ${i.fabricColor})`).join("; ");

      // Basic payload for SP City (NFS-e)
      const payload = {
        data_emissao: new Date().toISOString(),
        prestador: {
          cnpj: issuer.taxId.replace(/\D/g, ""),
          inscricao_municipal: "01231138" // Example, user should provide real one in settings
        },
        tomador: {
          cpf_cnpj: order.customerTaxId ? order.customerTaxId.replace(/\D/g, "") : null,
          razao_social: order.customerName,
          email: order.customerEmail,
          endereco: {
            logradouro: order.customerAddress.split(",")[0] || "",
            numero: order.customerAddress.split(",")[1]?.split("-")[0].trim() || "SN",
            bairro: order.customerAddress.split("-")[0]?.split(",")?.slice(-1)[0]?.trim() || "",
            codigo_municipio: "3550308", // São Paulo
            uf: "SP",
            cep: order.customerAddress.match(/\d{5}-?\d{3}/)?.[0].replace("-", "") || ""
          }
        },
        servico: {
          aliquota: 2, 
          discriminacao: itemsDescription,
          valor_servicos: totalValue,
          codigo_servico: "02658", // Confecção de roupas (example code for SP)
          iss_retido: false,
          item_lista_servico: "14.05" // Common for tailoring/clothing
        }
      };

      console.log(`[FocusNFe] Sending request to: ${BASE_URL}/v2/nfse?ref=${order.id}`);
      
      const response = await axios.post(`${BASE_URL}/v2/nfse?ref=${order.id}`, payload, {
        auth: {
          username: FOCUS_TOKEN,
          password: ""
        },
        timeout: 30000 // 30s timeout
      });

      console.log("[FocusNFe] Success:", response.data);
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error("[FocusNFe] Error Detail:", JSON.stringify(errorData, null, 2));
      
      // Handle specific FocusNFe errors
      if (error.response?.status === 422) {
        return res.status(422).json({ 
          error: "Dados inválidos", 
          mensagem: errorData.mensagem || "Verifique os dados do cliente e da empresa.",
          erros: errorData.erros 
        });
      }

      res.status(error.response?.status || 500).json({ 
        error: "Erro na comunicação com FocusNFe",
        details: errorData 
      });
    }
  });

  // Get NF-e status/PDF
  app.get("/api/nfe/status/:ref", async (req, res) => {
    try {
      if (!FOCUS_TOKEN) throw new Error("Missing Token");
      
      const response = await axios.get(`${BASE_URL}/v2/nfse/${req.params.ref}`, {
        auth: {
          username: FOCUS_TOKEN,
          password: ""
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 404 for API routes to prevent SPA fallback
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
