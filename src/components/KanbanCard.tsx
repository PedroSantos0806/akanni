import React, { useMemo } from 'react';
import { Calendar, User, ShoppingBag, AlertCircle, ArrowRight, ArrowLeft, Image as ImageIcon, FileText, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { STATUS_CONFIG } from '../constants';

interface KanbanCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onClick: (order: Order) => void;
  onIssueNfe: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ order, onStatusChange, onClick, onIssueNfe, onEdit, onDelete }) => {
  const statuses: OrderStatus[] = ['pending', 'cutting', 'sewing', 'finishing', 'delivered'];
  const currentIndex = statuses.indexOf(order.status);

  const isNfeRequired = order.status === 'finishing' || order.status === 'delivered';

  const delayInStatus = useMemo(() => {
    if (order.status === 'delivered') return 0;
    const startedAt = order.statusStartedAt ? new Date(order.statusStartedAt) : new Date(order.createdAt);
    const days = differenceInDays(new Date(), startedAt);
    const maxDays = STATUS_CONFIG[order.status].maxDays;
    return days > maxDays ? days - maxDays : 0;
  }, [order.status, order.statusStartedAt, order.createdAt]);

  return (
    <motion.div
      layoutId={order.id}
      className={`bg-white rounded-2xl border-l-[6px] shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col overflow-hidden ${
        delayInStatus > 0 ? 'border-red-500 ring-1 ring-red-100' : 'border-zinc-900 border-opacity-20'
      }`}
      onClick={() => onClick(order)}
    >
      {order.designImages && order.designImages.length > 0 && (
        <div className="h-32 w-full overflow-hidden bg-zinc-50 border-b border-zinc-100 relative flex group">
          {order.designImages.length === 1 ? (
            <img 
              src={order.designImages[0]} 
              alt="Desenho" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid grid-cols-2 w-full h-full gap-[1px]">
              {order.designImages.slice(0, 4).map((img, i) => (
                <img 
                  key={i}
                  src={img} 
                  alt={`Desenho ${i}`} 
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${order.designImages?.length === 2 ? 'aspect-square' : ''}`}
                  referrerPolicy="no-referrer"
                />
              ))}
              {order.designImages.length > 4 && (
                <div className="absolute bottom-1 right-1 bg-zinc-900/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                  + {order.designImages.length - 4}
                </div>
              )}
            </div>
          )}
          {delayInStatus > 0 && (
            <div className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg animate-bounce z-10">
              <AlertTriangle size={14} />
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-black text-zinc-900 leading-tight truncate">{order.customerName}</h4>
            {delayInStatus > 0 && (
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-tighter mt-1 flex items-center">
                <AlertCircle size={10} className="mr-1" />
                {delayInStatus} {delayInStatus === 1 ? 'dia' : 'dias'} em atraso
              </p>
            )}
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => onEdit(order)}
              className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors"
            >
              <Edit2 size={12} />
            </button>
            <button 
              onClick={() => {
                if (confirm('Deseja realmente excluir este pedido?')) {
                  onDelete(order.id);
                }
              }}
              className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          {order.items.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-center text-[10px] text-zinc-600">
              <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full mr-2 shrink-0" />
              <span className="truncate font-medium">{item.quantity}x {item.shirtType} <span className="opacity-50 text-[9px] uppercase tracking-tighter">{item.fabricColor}</span></span>
            </div>
          ))}
          {order.items.length > 2 && (
            <p className="text-[9px] text-zinc-400 font-bold ml-3.5">+ {order.items.length - 2} itens</p>
          )}
          
          <div className="flex items-center text-[10px] text-zinc-400 mt-2 px-1 py-0.5 bg-zinc-50 rounded w-fit">
            <Calendar size={10} className="mr-1 opacity-50" />
            <span>Entrega: {format(new Date(order.deliveryDate), 'dd/MM', { locale: ptBR })}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-50 mt-auto">
          <div className="flex space-x-1">
            {order.photos.length > 0 && (
              <div className="p-1 bg-zinc-50 rounded text-zinc-400 group-hover:text-blue-500 transition-colors">
                <ImageIcon size={14} />
              </div>
            )}
            {order.notes && (
              <div className="p-1 bg-zinc-50 rounded text-zinc-400 group-hover:text-zinc-900 transition-colors">
                <FileText size={14} />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            {isNfeRequired && !order.nfeIssued && (
              <button
                onClick={() => onIssueNfe(order)}
                className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-blue-700 transition-colors shadow-sm"
              >
                NF-e
              </button>
            )}

            <div className="flex space-x-0.5">
              {currentIndex > 0 && (
                <button
                  onClick={() => onStatusChange(order.id, statuses[currentIndex - 1])}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              
              {currentIndex < statuses.length - 1 && (
                <button
                  onClick={() => onStatusChange(order.id, statuses[currentIndex + 1])}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
                >
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
