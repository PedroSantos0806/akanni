import React, { useState } from 'react';
import { X, Send, CheckCircle, FileText, Loader2, Building, User, MapPin, Printer } from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NfePopupProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

const ISSUER_INFO = {
  name: "AKANNI CONFECÇÕES LTDA",
  taxId: "12.345.678/0001-90",
  address: "Rua da Indústria, 100 - Bairro Industrial",
  city: "São Paulo/SP",
  cep: "01001-000"
};

export const NfePopup: React.FC<NfePopupProps> = ({ order, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'preview' | 'success' | 'error'>('preview');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nfeResult, setNfeResult] = useState<any>(null);
  
  if (!order) return null;

  const totalValue = order.items.reduce((acc, i) => acc + (i.quantity * 85), 0);
  const currentDate = new Date().toLocaleString('pt-BR');

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, issuer: ISSUER_INFO })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensagem || data.error || "Erro ao emitir nota fiscal");
      }

      setNfeResult(data);
      setStep('success');
      onSuccess(order.id);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintFinal = () => {
    if (nfeResult?.url_pdf) {
      window.open(nfeResult.url_pdf, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl w-full max-w-4xl shadow-2xl relative my-8"
      >
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between no-print">
          <h2 className="text-xl font-bold text-zinc-900">Pré-visualização da nota</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-4 md:p-10 overflow-x-auto">
          {step === 'preview' ? (
            <div className="min-w-[800px] bg-white border border-black p-1 text-[11px] font-sans text-black leading-tight">
              {/* HEADER SP LAYOUT */}
              <div className="flex border-b border-black">
                <div className="w-1/4 p-2 flex items-center justify-center border-r border-black">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Bras%C3%A3o_da_cidade_de_S%C3%A3o_Paulo.svg/1024px-Bras%C3%A3o_da_cidade_de_S%C3%A3o_Paulo.svg.png" 
                    alt="Brasão SP" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div className="w-1/2 p-4 text-center flex flex-col justify-center border-r border-black">
                  <h3 className="font-bold text-base leading-none mb-1">PREFEITURA DO MUNICÍPIO DE SÃO PAULO</h3>
                  <h4 className="font-bold text-sm mb-1">SECRETARIA MUNICIPAL DE FINANÇAS</h4>
                  <h5 className="font-bold text-base tracking-tight">NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e</h5>
                </div>
                <div className="w-1/4 p-2 flex flex-col relative">
                  <div className="mb-2 border-b border-black pb-1">
                    <p className="text-[9px]">Número da Nota</p>
                    <p className="font-bold text-sm">-- PROVISÓRIA --</p>
                  </div>
                  <div className="mb-2 border-b border-black pb-1">
                    <p className="text-[9px]">Data e Hora da Emissão</p>
                    <p className="font-bold text-xs">{currentDate}</p>
                  </div>
                  <div>
                    <p className="text-[9px]">Código de Verificação</p>
                    <p className="font-mono text-xs">A1B2-C3D4-E5F6</p>
                  </div>
                </div>
              </div>

              {/* PRESTADOR */}
              <div className="border-b border-black">
                <div className="bg-zinc-100/50 text-center py-1 font-bold border-b border-black text-xs">PRESTADOR DE SERVIÇOS</div>
                <div className="p-3 space-y-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex">
                      <span className="font-bold mr-2">CNPJ/CPF:</span> {ISSUER_INFO.taxId}
                    </div>
                    <div className="flex">
                      <span className="font-bold mr-2">Inscrição Municipal:</span> 01231138
                    </div>
                  </div>
                  <div><span className="font-bold mr-2">Razão Social:</span> {ISSUER_INFO.name}</div>
                  <div><span className="font-bold mr-2">Endereço:</span> {ISSUER_INFO.address.toUpperCase()} {ISSUER_INFO.cep}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold mr-2">Município:</span> São Paulo</div>
                    <div><span className="font-bold mr-2">UF:</span> SP</div>
                  </div>
                </div>
              </div>

              {/* TOMADOR */}
              <div className="border-b border-black">
                <div className="bg-zinc-100/50 text-center py-1 font-bold border-b border-black text-xs">TOMADOR DE SERVIÇOS</div>
                <div className="p-3 space-y-1">
                  <div><span className="font-bold mr-2">Razão Social/Nome:</span> {order.customerName}</div>
                  <div><span className="font-bold mr-2">CNPJ/CPF:</span> {order.customerTaxId || "-- NÃO INFORMADO --"}</div>
                  <div><span className="font-bold mr-2">Inscrição Municipal:</span> --</div>
                  <div><span className="font-bold mr-2">Endereço:</span> {order.customerAddress?.toUpperCase() || "-- NÃO INFORMADO --"}</div>
                </div>
              </div>

              {/* SERVIÇOS */}
              <div className="min-h-[200px]">
                <div className="bg-zinc-100/50 text-center py-1 font-bold border-b border-black text-xs">DISCRIMINAÇÃO DOS SERVIÇOS</div>
                <div className="p-4 whitespace-pre-wrap font-mono uppercase">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="mb-2">
                       {item.quantity}x {item.shirtType} ({item.fabricType} - {item.fabricColor})
                    </div>
                  ))}
                  <div className="mt-4 text-zinc-400 italic">Preço Unitário de Referência: R$ 85,00 p/ unid.</div>
                </div>
              </div>

              {/* VALORES FOOTER */}
              <div className="border-t border-black bg-zinc-900 text-white p-3 text-right">
                <div className="flex justify-end items-baseline space-x-4">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Valor Total da Nota</span>
                  <span className="text-lg font-black tracking-tighter">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end space-x-3 no-print">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center"
                >
                  <Printer size={18} className="mr-2" />
                  Imprimir Prévia
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center shadow-lg shadow-zinc-200"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <Send size={18} className="mr-2" />
                  )}
                  Emitir Nota Fiscal Agora
                </button>
              </div>
            </div>
          ) : step === 'success' ? (
            <div className="py-8 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle size={32} />
              </motion.div>
              <h3 className="text-xl font-bold text-zinc-900 mb-6">NF-e Emitida com Sucesso!</h3>
              
              {/* Final Document View */}
              <div className="w-full mb-8 opacity-60 pointer-events-none scale-90 origin-top border border-zinc-200 rounded-lg overflow-hidden grayscale">
                 <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold text-center py-1 uppercase tracking-widest border-b border-emerald-100">
                   Documento com Validade Fiscal Confirmada
                 </div>
                 <div className="p-4 bg-white space-y-2">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-bold">Nº da Nota: {nfeResult?.numero || "000.452.128"}</span>
                      <span>Emissão: {currentDate}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Chave de Acesso: {nfeResult?.chave_nfe || "3524 0512 3456 7800 0190 5500 1000 4521 2810 0987 6543"}
                    </div>
                 </div>
              </div>

              <div className="flex items-center space-x-3 w-full">
                <button 
                  onClick={handlePrintFinal}
                  className="flex-1 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center"
                >
                  <Printer size={18} className="mr-2" />
                  Abrir PDF Oficial
                </button>
                <button 
                  onClick={onClose}
                  className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Erro na Emissão</h3>
              <p className="text-zinc-500 text-center max-w-sm mb-8 leading-relaxed">
                {errorMsg}
              </p>
              <button 
                onClick={() => setStep('preview')}
                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Voltar e Corrigir
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
