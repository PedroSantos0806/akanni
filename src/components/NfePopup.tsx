import React from 'react';
import { X, Send, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NfePopupProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export const NfePopup: React.FC<NfePopupProps> = ({ order, onClose, onSuccess }) => {
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [formData, setFormData] = React.useState({
    taxId: order?.customerTaxId || '',
    address: order?.customerAddress || '',
    rpsType: 'RPS',
    rpsSeries: 'A',
    serviceValue: order?.items ? order.items.reduce((acc, i) => acc + (i.quantity * 85), 0).toFixed(2) : '0.00',
    serviceCode: '01.01', // Example code from manual
  });

  if (!order) return null;

  const generateXML = () => {
    // Following manual Version 3.3.5 structure (simplified)
    const itemsXML = order.items.map(i => `
      <Servico>
        <Discriminacao>${i.quantity}x ${i.shirtType} em ${i.fabricType} ${i.fabricColor}</Discriminacao>
        <ValorServicos>${(i.quantity * 85).toFixed(2).replace('.', '')}</ValorServicos>
      </Servico>
    `).join('');

    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
        <Cabecalho>
          <Versao>2</Versao>
          <CPFCNPJRemetente><CNPJ>12345678000199</CNPJ></CPFCNPJRemetente>
        </Cabecalho>
        <RPS>
          <Assinatura>RSA-SHA1-HASH-SIMULADO</Assinatura>
          <ChaveRPS>
            <InscricaoPrestador>12345678</InscricaoPrestador>
            <SerieRPS>${formData.rpsSeries}</SerieRPS>
            <NumeroRPS>${Math.floor(Math.random() * 10000)}</NumeroRPS>
          </ChaveRPS>
          <TipoRPS>${formData.rpsType === 'RPS' ? '1' : '2'}</TipoRPS>
          <DataEmissao>${new Date().toISOString().split('T')[0]}</DataEmissao>
          <StatusRPS>N</StatusRPS>
          <TributacaoRPS>T</TributacaoRPS>
          <ValorServicos>${formData.serviceValue.replace('.', '')}</ValorServicos>
          <CodigoServico>2658</CodigoServico>
          <CPFCNPJTomador>
            <CNPJ>${formData.taxId.replace(/\D/g, '')}</CNPJ>
          </CPFCNPJTomador>
          ${itemsXML}
        </RPS>
      </PedidoEnvioRPS>
    `;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log("Gerando XML seguindo Manual SP 3.3.5...", generateXML());
    
    // Simulating EnvioLoteRPS (Síncrono) described in section 4.3.3
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    setStep('success');
    setTimeout(() => {
      onSuccess(order.id);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Emissão de NF-e</h2>
          <p className="text-zinc-500 text-sm">Pedido: {order.customerName} - {order.quantity} unidades</p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Tipo de RPS</label>
                <select 
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={formData.rpsType}
                  onChange={(e) => setFormData({ ...formData, rpsType: e.target.value })}
                >
                  <option>RPS</option>
                  <option>RPS-M</option>
                  <option>RPS-C</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Série</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  value={formData.rpsSeries}
                  onChange={(e) => setFormData({ ...formData, rpsSeries: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">CPF / CNPJ do Tomador</label>
              <input
                type="text"
                required
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Endereço de Entrega</label>
              <textarea
                required
                placeholder="Rua, Número, CEP, Cidade - SP"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-20 resize-none text-sm"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Valor do Serviço</span>
              <span className="text-xl font-black text-blue-700">R$ {formData.serviceValue}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Send size={20} className="mr-2" />
                  Emitir Nota Fiscal
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle size={40} />
            </motion.div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">NF-e Emitida com Sucesso!</h3>
            <p className="text-zinc-500">O arquivo será enviado para o cliente e transportadora.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
