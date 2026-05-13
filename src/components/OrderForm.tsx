import React, { useState, useMemo } from 'react';
import { X, Save, Plus, Package, Calculator, Trash2, ShoppingBasket, AlertCircle } from 'lucide-react';
import { Order, OrderStatus, FabricTemplate, OrderItem, StockItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface OrderFormProps {
  templates: FabricTemplate[];
  stock: StockItem[];
  onClose: () => void;
  onSubmit: (order: Partial<Order>) => void;
  initialData?: Order | null;
}

export const OrderForm: React.FC<OrderFormProps> = ({ templates, stock, onClose, onSubmit, initialData }) => {
  // Extract unique fabric types and colors from stock
  const fabrics = useMemo(() => {
    const list = stock.filter(s => s.type === 'fabric');
    const types = Array.from(new Set(list.map(s => s.name)));
    return types.map(type => ({
      name: type,
      colors: Array.from(new Set(list.filter(s => s.name === type).map(s => s.color)))
    }));
  }, [stock]);

  const [customerInfo, setCustomerInfo] = useState({
    customerName: initialData?.customerName || '',
    customerEmail: initialData?.customerEmail || '',
    deliveryDate: initialData?.deliveryDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    designImages: initialData?.designImages || [] as string[],
  });

  const [items, setItems] = useState<Partial<OrderItem>[]>(
    initialData?.items || [{
      templateId: templates[0]?.id || '',
      shirtType: templates[0]?.name || '',
      quantity: 10,
      fabricType: fabrics[0]?.name || '',
      fabricColor: fabrics[0]?.colors[0] || '',
      fabricUsagePerUnit: templates[0]?.fabricConsumption || 1.2,
      totalFabricEstimate: (10 * (templates[0]?.fabricConsumption || 1.2))
    }]
  );

  const addItem = () => {
    setItems([...items, {
      templateId: templates[0]?.id || '',
      shirtType: templates[0]?.name || '',
      quantity: 10,
      fabricType: fabrics[0]?.name || '',
      fabricColor: fabrics[0]?.colors[0] || '',
      fabricUsagePerUnit: templates[0]?.fabricConsumption || 1.2,
      totalFabricEstimate: (10 * (templates[0]?.fabricConsumption || 1.2))
    }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const getAvailableStock = (type: string, color: string) => {
    const item = stock.find(s => s.name === type && s.color === color);
    return item ? item.quantity : 0;
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[idx], [field]: value };
    
    if (field === 'templateId') {
      const template = templates.find(t => t.id === value);
      if (template) {
        item.shirtType = template.name;
        item.fabricUsagePerUnit = template.fabricConsumption;
      }
    }

    if (field === 'fabricType') {
        const typeData = fabrics.find(f => f.name === value);
        item.fabricColor = typeData?.colors[0] || '';
    }

    const q = Number.isNaN(item.quantity) ? 0 : (item.quantity || 0);
    const u = Number.isNaN(item.fabricUsagePerUnit) ? 0 : (item.fabricUsagePerUnit || 0);
    item.totalFabricEstimate = parseFloat((q * u).toFixed(1));

    newItems[idx] = item;
    setItems(newItems);
  };

  const calculateGrandTotalFabric = () => {
    return items.reduce((acc, item) => acc + (item.totalFabricEstimate || 0), 0).toFixed(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.customerName) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    const finalItems = items.map(item => ({
      ...item,
      quantity: Number.isNaN(item.quantity) ? 0 : item.quantity,
    })) as OrderItem[];

    if (finalItems.some(i => i.quantity <= 0)) {
      alert('Todas as quantidades devem ser maiores que zero.');
      return;
    }

    onSubmit({
      ...customerInfo,
      items: finalItems,
      status: initialData ? initialData.status : 'pending',
      photos: initialData?.photos || [],
      isDelayed: initialData?.isDelayed || false,
      nfeIssued: initialData?.nfeIssued || false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 max-w-4xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-zinc-900 text-white rounded-2xl">
              <ShoppingBasket size={24} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {initialData ? 'Editar Pedido de Confecção' : 'Novo Pedido de Confecção'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sessão Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2 mb-4">Cliente</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                    value={customerInfo.customerName}
                    onChange={e => setCustomerInfo({ ...customerInfo, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">E-mail</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                    value={customerInfo.customerEmail}
                    onChange={e => setCustomerInfo({ ...customerInfo, customerEmail: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Data Estimada de Entrega</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={customerInfo.deliveryDate}
                      onChange={e => setCustomerInfo({ ...customerInfo, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Desenhos/Projetos</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {customerInfo.designImages.map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 group">
                          <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setCustomerInfo({ 
                              ...customerInfo, 
                              designImages: customerInfo.designImages.filter((_, idx) => idx !== i) 
                            })}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {customerInfo.designImages.length < 6 && (
                        <label className="aspect-video border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors">
                          <Plus size={20} className="text-zinc-400" />
                          <span className="text-[10px] text-zinc-400 font-bold mt-1">Upload</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const files = Array.from(e.target.files || []) as File[];
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCustomerInfo(prev => ({
                                    ...prev,
                                    designImages: [...prev.designImages, reader.result as string]
                                  }));
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Listagem de Itens */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Itens da Produção</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-bold text-zinc-900 hover:text-zinc-600 flex items-center bg-zinc-50 px-3 py-1.5 rounded-full transition-all"
                >
                  <Plus size={14} className="mr-1" /> Add Produto
                </button>
              </div>

              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => {
                    const available = getAvailableStock(item.fabricType || '', item.fabricColor || '');
                    const isOutOfStock = available < (item.totalFabricEstimate || 0);

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 relative group"
                      >
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Modelo</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                              value={item.templateId}
                              onChange={e => updateItem(idx, 'templateId', e.target.value)}
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.fabricConsumption}m/un)</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Quantidade</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Total m</label>
                            <div className="text-sm font-mono font-bold text-zinc-600 pt-2">{item.totalFabricEstimate}m</div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Tipo de Tecido</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                              value={item.fabricType}
                              onChange={e => updateItem(idx, 'fabricType', e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {fabrics.map(f => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Cor</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                              value={item.fabricColor}
                              onChange={e => updateItem(idx, 'fabricColor', e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {fabrics.find(f => f.name === item.fabricType)?.colors.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {item.fabricType && item.fabricColor && (
                          <div className={`mt-4 p-3 rounded-xl flex items-center space-x-2 ${isOutOfStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {isOutOfStock ? <AlertCircle size={14} className="shrink-0" /> : <Package size={14} className="shrink-0" />}
                            <span className="text-xs font-bold">
                              Estoque atual: {available}m 
                              {isOutOfStock && ` (Faltam ${(item.totalFabricEstimate! - available).toFixed(1)}m para este lote)`}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="bg-zinc-900 text-white p-4 rounded-2xl flex items-center space-x-4 w-full md:w-auto">
              <div className="p-2 bg-white/10 rounded-xl">
                <Calculator size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Consumo Total</p>
                <p className="text-xl font-black">{calculateGrandTotalFabric()}m <span className="text-xs font-normal">de tecido</span></p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
            >
              <Save size={20} className="mr-2" />
              {initialData ? 'Atualizar Pedido' : 'Iniciar Produção'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
