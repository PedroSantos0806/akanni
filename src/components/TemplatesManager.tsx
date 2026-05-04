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
  const [newName, setNewName] = useState('');
  const [newConsumption, setNewConsumption] = useState(1.2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newConsumption > 0) {
      onAdd(newName, newConsumption);
      setNewName('');
      setNewConsumption(1.2);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center">
          <Ruler size={24} className="mr-2 text-zinc-400" />
          Configurar Consumo de Tecido por Modelo
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Nome do Modelo (ex: Camiseta M)</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o nome..."
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Consumo (m/un)</label>
            <input
              type="number"
              step="0.1"
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
              value={Number.isNaN(newConsumption) ? '' : newConsumption}
              onChange={(e) => setNewConsumption(parseFloat(e.target.value))}
            />
          </div>
          <button
            type="submit"
            className="h-[42px] bg-zinc-900 text-white px-6 rounded-xl font-bold flex items-center hover:bg-zinc-800 transition-all"
          >
            <Plus size={18} className="mr-2" />
            Adicionar Modelo
          </button>
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
