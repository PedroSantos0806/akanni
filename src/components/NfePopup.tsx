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
  const [step, setStep] = useState<'preview' | 'success'>('preview');
  
  if (!order) return null;

  const totalValue = order.items.reduce((acc, i) => acc + (i.quantity * 85), 0);

  const handleSubmit = async () => {
    setLoading(true);
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setStep('success');
    setTimeout(() => {
      onSuccess(order.id);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden relative"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 leading-none">Prévia da NF-e</h2>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Conferência Obrigatória</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {step === 'preview' ? (
            <div className="space-y-8">
              {/* NF-e Header Simulation */}
              <div className="border-2 border-zinc-100 rounded-2xl p-6 bg-zinc-50/30 relative">
                <div className="absolute top-4 right-6 text-xs font-mono text-zinc-400">DANFE nº 000.452.128</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                  {/* EMISSOR */}
                  <div className="space-y-3">
                    <div className="flex items-center text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                      <Building size={12} className="mr-1" /> Dados do Emissor
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm leading-tight">{ISSUER_INFO.name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">CNPJ: {ISSUER_INFO.taxId}</p>
                      <div className="flex items-start text-xs text-zinc-500 mt-2">
                        <MapPin size={12} className="mr-1 mt-0.5 shrink-0" />
                        <span>{ISSUER_INFO.address}<br />{ISSUER_INFO.city} - {ISSUER_INFO.cep}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOMADOR/CLIENTE */}
                  <div className="space-y-3 md:border-l md:border-zinc-200 md:pl-8">
                    <div className="flex items-center text-[10px] font-black text-zinc-900 uppercase tracking-tighter opacity-40">
                      <User size={12} className="mr-1" /> Dados do Destinatário
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm leading-tight">{order.customerName}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">CPF/CNPJ: {order.customerTaxId || 'Não informado'}</p>
                      <div className="flex items-start text-xs text-zinc-500 mt-2">
                        <MapPin size={12} className="mr-1 mt-0.5 shrink-0" />
                        <span>{order.customerAddress || <span className="italic">Endereço não informado</span>}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itens da Nota */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Detalhamento dos Serviços</h3>
                <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold">
                      <tr>
                        <th className="px-4 py-3">Descrição do Serviço</th>
                        <th className="px-4 py-3 text-center">Quant.</th>
                        <th className="px-4 py-3 text-right">Valor Un.</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-4">
                            <p className="font-bold text-zinc-900">{item.shirtType}</p>
                            <p className="text-zinc-400 mt-0.5 italic">{item.fabricType} - {item.fabricColor}</p>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-zinc-600">{item.quantity}</td>
                          <td className="px-4 py-4 text-right text-zinc-600">R$ 85,00</td>
                          <td className="px-4 py-4 text-right font-black text-zinc-900">R$ {(item.quantity * 85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-900 text-white">
                      <tr>
                        <td colSpan={3} className="px-4 py-4 font-bold text-right text-[10px] uppercase tracking-wider opacity-60">Valor Total da Nota</td>
                        <td className="px-4 py-4 text-right text-base font-black">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={20} className="mr-2" />
                      Emitir Nota Fiscal Agora
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-colors no-print"
                  title="Imprimir Prévia"
                >
                  <Printer size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner"
              >
                <CheckCircle size={48} />
              </motion.div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">NF-e Protocolada!</h3>
              <p className="text-zinc-500 leading-relaxed max-w-sm mx-auto">
                A nota fiscal foi processada pela prefeitura. O XML e PDF já estão disponíveis para o cliente.
              </p>
              
              <div className="mt-10 px-6 py-3 bg-zinc-50 rounded-full border border-zinc-100 text-xs font-mono text-zinc-400">
                Chave: 3524 0512 3456 7800 0190 5500 1000 4521 2810 0987 6543
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
