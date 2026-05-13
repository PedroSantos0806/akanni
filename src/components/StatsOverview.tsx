import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, AlertTriangle, CheckCircle, ShoppingBag } from 'lucide-react';
import { Order, StockItem } from '../types';

interface StatsOverviewProps {
  orders: Order[];
  stock: StockItem[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ orders, stock }) => {
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status !== 'delivered').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const delayed = orders.filter(o => o.isDelayed).length;
    const lowStock = stock.filter(s => s.quantity <= s.minQuantity).length;

    const totalActiveUnits = orders
      .filter(o => o.status !== 'delivered')
      .reduce((acc, o) => acc + (Array.isArray(o.items) ? o.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0), 0);

    return [
      { label: 'Unidades Ativas', value: totalActiveUnits, icon: <Package className="text-blue-500" />, trend: '+12% este mês' },
      { label: 'Pedidos Ativos', value: pending, icon: <ShoppingBag className="text-zinc-900" />, trend: 'Akanni Flow' },
      { label: 'Atrasos Alertados', value: delayed, icon: <AlertTriangle className="text-amber-500" />, trend: '-2% vs ontem' },
      { label: 'Matéria-prima Baixa', value: lowStock, icon: <AlertTriangle className="text-red-500" />, trend: 'Urgente' },
    ];
  }, [orders, stock]);

  const chartData = useMemo(() => {
    // Group by shirts type/status
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-8">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-zinc-50 rounded-lg">{stat.icon}</div>
              <span className="text-xs font-medium text-zinc-400">{stat.trend}</span>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900">{stat.value}</h3>
            <p className="text-sm text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Production Flow Chart */}
        <div className="bg-white p-8 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Fluxo de Produção</h2>
              <p className="text-sm text-zinc-500">Distribuição por status atual</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock status */}
        <div className="bg-white p-8 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Nível de Estoque</h2>
              <p className="text-sm text-zinc-500">Materiais mais utilizados</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stock.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="quantity"
                  nameKey="name"
                >
                  {stock.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
