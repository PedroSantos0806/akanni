import React from 'react';
import { LayoutDashboard, ShoppingBag, Box, Users, Settings, LogOut, Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  key?: string;
}

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const DashboardLayout: React.FC<{ children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral'] },
    { id: 'orders', label: 'Produção (Kanban)', icon: <ShoppingBag size={20} />, roles: ['super_admin', 'admin_geral', 'gerente_producao', 'funcionario_padrao'] },
    { id: 'templates', label: 'Modelos de Gasto', icon: <Box size={20} />, roles: ['super_admin', 'admin_geral', 'funcionario_padrao'] },
    { id: 'inventory', label: 'Estoque de Tecidos', icon: <Box size={20} />, roles: ['super_admin', 'admin_geral', 'funcionario_padrao'] },
    { id: 'users', label: 'Usuários', icon: <Users size={20} />, roles: ['super_admin'] },
    { id: 'settings', label: 'Minha Conta', icon: <Settings size={20} />, roles: ['super_admin', 'admin_geral', 'gerente_producao', 'gestor_geral', 'funcionario_padrao'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    profile?.role === 'super_admin' || (item.roles as string[]).includes(profile?.role || '')
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-zinc-200 flex flex-col relative"
      >
        <div className="p-6 border-b border-zinc-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-zinc-900 rounded flex items-center justify-center text-white font-bold text-xs">AK</div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">Akanni Confecções</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden ring-2 ring-white">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} alt="Avatar" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-zinc-900">{profile?.displayName || 'USUÁRIO'}</p>
              <p className="text-[10px] text-zinc-400 font-mono truncate uppercase tracking-widest">
                {profile?.role === 'super_admin' ? 'Administrador' : 
                 profile?.role === 'admin_geral' ? 'Gerente Geral' :
                 profile?.role === 'gerente_producao' ? 'Produção' :
                 profile?.role === 'gestor_geral' ? 'Gestor' : 'Equipe'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-zinc-900 uppercase tracking-wider text-xs opacity-50">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
