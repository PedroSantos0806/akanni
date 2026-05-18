import React, { useState } from 'react';
import { Ruler, Plus, Trash2, Save } from 'lucide-react';
import { FabricTemplate } from '../types';
import { motion } from 'motion/react';

interface TemplatesManagerProps {
  templates: FabricTemplate[];
  onAdd: (name: string, consumption: number) => void;
  onDelete: (id: string) => void;
}

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({ templates, onAdd, onDelete }) => {
  const [formData, setFormData] = useState({
    size: 'M',
    fabric: 'Algodão',
    collar: 'Gola Careca',
    style: 'Manga Curta',
    consumption: 1.2
  });

  const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'];
  const FABRICS = ['Algodão', 'Poliéster', 'Viscose', 'Dry-Fit', 'Piquet', 'Linho', 'Seda'];
  const COLLARS = ['Gola Careca', 'Gola V', 'Gola Polo', 'Gola Padre', 'Gola Canoa'];
  const STYLES = ['Manga Curta', 'Manga Longa', 'Regata', 'Baby Look', 'Oversized'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = `${formData.style} - ${formData.fabric} - ${formData.collar} (${formData.size})`;
    
    if (formData.consumption > 0) {
      try {
        await onAdd(name, formData.consumption);
        setFormData({
          ...formData,
          consumption: 1.2
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("O consumo deve ser maior que zero.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm transition-all hover:shadow-md">
        <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center">
          <Ruler size={24} className="mr-2 text-zinc-900" />
          Novo Modelo de Gasto
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tamanho</label>
              <select 
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-medium"
                value={formData.size}
                onChange={(e) => setFormData({...formData, size: e.target.value})}
              >
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tipo de Tecido</label>
              <select 
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-medium"
                value={formData.fabric}
                onChange={(e) => setFormData({...formData, fabric: e.target.value})}
              >
                {FABRICS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tipo de Gola</label>
              <select 
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-medium"
                value={formData.collar}
                onChange={(e) => setFormData({...formData, collar: e.target.value})}
              >
                {COLLARS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Modelo</label>
              <select 
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-medium"
                value={formData.style}
                onChange={(e) => setFormData({...formData, style: e.target.value})}
              >
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-50 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-[200px]">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest text-zinc-950">Consumo de Tecido (m/un)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className="w-full h-12 pl-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold text-lg"
                  value={formData.consumption}
                  onChange={(e) => setFormData({...formData, consumption: parseFloat(e.target.value) || 0})}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs uppercase">metros</span>
              </div>
            </div>

            <button
              type="submit"
              className="h-12 bg-zinc-900 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest flex items-center hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 active:scale-[0.98]"
            >
              <Plus size={18} className="mr-2" />
              Cadastrar Modelo
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <motion.div
            layout
            key={template.id}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between group"
          >
            <div>
              <h3 className="font-bold text-zinc-900">{template.name}</h3>
              <p className="text-sm text-zinc-500">{template.fabricConsumption} m por unidade</p>
            </div>
            <button
              onClick={() => onDelete(template.id)}
              className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={18} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
