import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Order, OrderStatus, StockItem, FabricTemplate } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { StatsOverview } from './components/StatsOverview';
import { KanbanCard } from './components/KanbanCard';
import { InventoryList } from './components/InventoryList';
import { OrderForm } from './components/OrderForm';
import { NfePopup } from './components/NfePopup';
import { TemplatesManager } from './components/TemplatesManager';
import { Plus, Loader2, LogIn, Lock, Users, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { predictDelay } from './services/aiService';

import { UserManagement } from './components/UserManagement';
import { Settings } from './components/Settings';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DroppableProvided } from '@hello-pangea/dnd';
import { STATUS_CONFIG } from './constants';

const DraggableComponent = Draggable as any;
const DroppableComponent = Droppable as any;

const OrderBoard = () => {
  const { user, profile, loading: authLoading, setManualAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (profile?.role === 'gestor_geral') {
      setActiveTab('dashboard');
    } else if (profile?.role === 'gerente_producao') {
      setActiveTab('orders');
    }
  }, [profile]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [templates, setTemplates] = useState<FabricTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  // Modals state
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [nfeOrder, setNfeOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setOrders(data.map((o: any) => ({
          id: o.id,
          customerName: o.customer_name || 'Sem Nome',
          customerEmail: o.customer_email || '',
          customerTaxId: o.customer_tax_id || '',
          customerAddress: o.customer_address || '',
          status: o.status || 'pending',
          statusStartedAt: o.status_started_at || new Date().toISOString(),
          items: Array.isArray(o.items) ? o.items.map((i: any) => ({
            ...i,
            quantity: Number(i.quantity) || 0,
            totalFabricEstimate: Number(i.totalFabricEstimate) || 0
          })) : [],
          deliveryDate: o.delivery_date || new Date().toISOString(),
          designImages: Array.isArray(o.design_images) ? o.design_images : [],
          createdAt: o.created_at,
          updatedAt: o.updated_at,
          photos: Array.isArray(o.photos) ? o.photos : [],
          isDelayed: !!o.is_delayed,
          nfeIssued: !!o.nfe_issued
        } as Order)));
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase.from('stock').select('*').order('name');
      if (error) throw error;
      if (data) {
        setStock(data.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          color: s.color,
          quantity: s.quantity,
          unit: s.unit,
          minQuantity: s.min_quantity
        } as StockItem)));
      }
    } catch (err) {
      console.error("Error fetching stock:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.from('templates').select('*').order('name');
      if (error) throw error;
      if (data) {
        setTemplates(data.map((t: any) => ({
          id: t.id,
          name: t.name,
          fabricConsumption: t.fabric_consumption
        } as FabricTemplate)));
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchOrders(), fetchStock(), fetchTemplates()]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initData();

    const ordersChannel = supabase.channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    
    return () => {
      mounted = false;
      supabase.removeChannel(ordersChannel);
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !password) {
      setAuthError('Digite seu usuário e senha.');
      return;
    }

    const trimmedInput = email.trim();
    const finalPassword = password.trim();
    
    // Normalize login identifier (email or username)
    const isPedro = trimmedInput.toLowerCase() === 'pedro_santos' || 
                    trimmedInput.toLowerCase() === 'pedro santos' || 
                    trimmedInput.toLowerCase() === 'pedro henrique silva dos santos' ||
                    trimmedInput.toLowerCase() === 'pedro_santos@akanni.com';

    const loginId = isPedro ? 'pedro_santos@akanni.com' : (trimmedInput.includes('@') ? trimmedInput.toLowerCase() : trimmedInput);

    try {
      // 1. Direct Database Check (The "Simple Auth" the user asked for)
      const { data: userDoc, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${loginId},email.eq.${loginId},username.eq.${trimmedInput}`)
        .single();

      // Bootstrap for Pedro Santos if DB is empty
      if (isPedro && !userDoc && (finalPassword === 'Admin123' || finalPassword === 'adminakanni')) {
        const adminProfile = {
          id: 'pedro_santos@akanni.com',
          uid: 'manual_admin_' + Date.now(),
          displayName: 'Pedro Santos',
          email: 'pedro_santos@akanni.com',
          role: 'super_admin'
        };
        
        // Push to DB for persistence
        await supabase.from('users').upsert({
          id: adminProfile.id,
          uid: adminProfile.uid,
          email: adminProfile.email,
          username: 'pedro_santos',
          display_name: adminProfile.displayName,
          role: adminProfile.role,
          temp_password: finalPassword
        });

        setManualAuth({ id: adminProfile.uid, email: adminProfile.email } as any, adminProfile as any);
        return;
      }

      if (userDoc) {
        // Simple password check against metadata table
        if (userDoc.temp_password === finalPassword || (isPedro && (finalPassword === 'Admin123' || finalPassword === 'adminakanni'))) {
          const manualProfile = {
            id: userDoc.id,
            uid: userDoc.uid || ('manual_' + userDoc.id),
            displayName: userDoc.display_name || userDoc.username || 'Usuário',
            email: userDoc.email || userDoc.id,
            role: userDoc.role
          };
          
          setManualAuth({ id: manualProfile.uid, email: manualProfile.email } as any, manualProfile as any);
          return;
        } else {
          throw new Error('Senha incorreta para este usuário.');
        }
      }

      // 2. Fallback to Supabase Auth (Sign In)
      const { data: { user: authUser }, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginId,
        password: finalPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          // Bypass confirmation if record exists in our table
          const { data: fallbackDoc } = await supabase.from('users').select('*').eq('id', loginId).single();
          if (fallbackDoc) {
            const manualProfile = {
                id: fallbackDoc.id,
                uid: 'manual_' + fallbackDoc.id,
                displayName: fallbackDoc.display_name || fallbackDoc.username || 'Usuário',
                email: fallbackDoc.email || fallbackDoc.id,
                role: fallbackDoc.role
              };
              setManualAuth({ id: manualProfile.uid, email: manualProfile.email } as any, manualProfile as any);
              return;
          }
        }
        throw signInError;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Usuário ou senha incorretos.');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('Digite seu e-mail/usuário para receber o link de redefinição.');
      return;
    }
    const finalEmail = email.includes('@') ? email : `${email}@akanni.com`;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(finalEmail);
      if (error) throw error;
      alert(`Um link de redefinição foi enviado para ${finalEmail}. Verifique sua caixa de entrada.`);
    } catch (err: any) {
      console.error(err);
      setAuthError('Erro ao enviar e-mail de redefinição.');
    }
  };

  const handleCreateTemplate = async (name: string, consumption: number) => {
    try {
      const { error } = await supabase.from('templates').insert({ name, fabric_consumption: consumption });
      if (error) throw error;
    } catch (err: any) {
      console.error("Error creating template:", err);
      alert("Erro ao criar modelo: " + (err.message || "Tente novamente."));
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Deseja realmente remover este modelo?')) return;
    try {
      const { error } = await supabase.from('templates').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting template:", err);
      alert("Erro ao excluir modelo: " + (err.message || "Tente novamente."));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ 
        status: newStatus,
        status_started_at: new Date().toISOString()
      }).eq('id', orderId);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error changing status:", err);
      alert("Erro ao mudar status: " + (err.message || "Tente novamente."));
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as OrderStatus;
    
    const order = orders.find(o => o.id === draggableId);
    if (order && order.status !== newStatus) {
      handleStatusChange(draggableId, newStatus);
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_tax_id: orderData.customerTaxId || '',
        customer_address: orderData.customerAddress || '',
        items: (orderData.items || []).map(i => ({
            ...i,
            quantity: Number(i.quantity) || 0,
            totalFabricEstimate: Number(i.totalFabricEstimate) || 0
        })),
        status: orderData.status || 'pending',
        delivery_date: orderData.deliveryDate,
        design_images: orderData.designImages || [],
        photos: orderData.photos || [],
        is_delayed: !!orderData.isDelayed,
        nfe_issued: !!orderData.nfeIssued
      };

      if (editingOrder) {
        const { error } = await supabase.from('orders').update(payload).eq('id', editingOrder.id);
        if (error) throw error;
        setEditingOrder(null);
        setIsOrderFormOpen(false);
        return;
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...payload,
          status_started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;
      
      setIsOrderFormOpen(false);
    } catch (err: any) {
      console.error("Order operation failed", err);
      alert("Erro ao salvar pedido: " + (err.message || "Verifique sua conexão ou permissões."));
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await supabase.from('orders').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsOrderFormOpen(true);
  };

  const handleAddStockItem = async (data: Partial<StockItem>) => {
    try {
      const { error } = await supabase.from('stock').insert({
        name: data.name,
        type: data.type,
        color: data.color,
        quantity: data.quantity,
        unit: data.unit,
        min_quantity: data.minQuantity
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Error adding stock item:", err);
      alert("Erro ao cadastrar material: " + (err.message || "Tente novamente."));
    }
  };

  const handleUpdateStockItem = async (id: string, data: Partial<StockItem>) => {
    try {
      const { error } = await supabase.from('stock').update({
        name: data.name,
        type: data.type,
        color: data.color,
        quantity: data.quantity,
        unit: data.unit,
        min_quantity: data.minQuantity
      }).eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating stock item:", err);
      alert("Erro ao atualizar material: " + (err.message || "Tente novamente."));
    }
  };

  const handleDeleteStockItem = async (id: string) => {
    try {
      const { error } = await supabase.from('stock').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting stock item:", err);
      alert("Erro ao excluir material: " + (err.message || "Tente novamente."));
    }
  };

  const handleUpdateStockQuantity = async (id: string, delta: number) => {
    try {
      const item = stock.find(s => s.id === id);
      if (item) {
        const { error } = await supabase.from('stock').update({ quantity: item.quantity + delta }).eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Error updating stock quantity:", err);
      alert("Erro ao atualizar quantidade: " + (err.message || "Tente novamente."));
    }
  };

  const handleNfeSuccess = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ nfe_issued: true }).eq('id', orderId);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating NFE status:", err);
      alert("Erro ao atualizar status da NFE: " + (err.message || "Tente novamente."));
    }
  };

  const columns: { title: string; status: OrderStatus }[] = [
    { title: 'Pendentes', status: 'pending' },
    { title: 'Corte', status: 'cutting' },
    { title: 'Costura', status: 'sewing' },
    { title: 'Acabamento', status: 'finishing' },
    { title: 'Despachado', status: 'delivered' },
  ];

  // Determine if we should show the login screen
  const isAuthReady = !authLoading && (!user || (user && profile));
  
  if (!isAuthReady || !user || !profile) {
    // If we have a user but no profile, and auth isn't loading, it's an error
    if (!authLoading && user && !profile) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-50 p-4">
          <div className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-zinc-100 text-center">
            <AlertTriangle className="text-amber-500 mx-auto mb-6" size={48} />
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Acesso Restrito</h1>
            <p className="text-zinc-500 mb-8 italic">Seu usuário foi autenticado, mas seu perfil de acesso não foi encontrado ou ainda não foi aprovado.</p>
            <p className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest">{user.email}</p>
            <button 
              onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              className="w-full py-5 bg-zinc-900 text-white rounded-[22px] font-black text-lg flex items-center justify-center hover:bg-zinc-800 transition-all shadow-xl"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      );
    }

    if (authLoading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin text-zinc-900 mb-4" size={48} />
            <p className="text-zinc-500 font-medium animate-pulse">Autenticando...</p>
            <button 
              onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              className="mt-8 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest"
            >
              Cancelar e ir para Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-zinc-100 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-8 shadow-xl">AK</div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tighter">Akanni Confecções</h1>
          <p className="text-zinc-500 mb-8 font-medium italic">Alfaiataria Industrial Inteligente</p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1 tracking-widest">Usuário</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Ex: pedro_santos"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1 tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="Sua senha"
                  className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 italic">
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-zinc-900 text-white rounded-[22px] font-black text-lg flex items-center justify-center hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.98] group"
            >
              <LogIn size={20} className="mr-3 group-hover:translate-x-1 transition-transform" />
              Entrar no Sistema
            </button>
          </form>

          <button 
            type="button"
            onClick={handleResetPassword}
            className="mt-6 text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white p-4">
        <div className="max-w-sm w-full text-center">
          <Loader2 className="animate-spin text-zinc-900 mx-auto mb-6" size={48} />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Carregando Dados</h2>
          <p className="text-zinc-500">Isso pode levar alguns segundos se a conexão estiver lenta.</p>
          
          <div className="flex flex-col space-y-4 mt-8">
            <button 
              onClick={() => window.location.reload()}
              className="text-zinc-900 text-sm font-bold bg-zinc-100 py-3 rounded-xl hover:bg-zinc-200 transition-all"
            >
              Tentar recarregar página
            </button>
            <button 
              onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              className="text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Sair do Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <StatsOverview orders={orders} stock={stock} />
      )}

      {activeTab === 'orders' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">Quadro de Produção</h2>
              <p className="text-zinc-500 text-sm">Arraste os pedidos para mudar o status</p>
            </div>
            <button
              onClick={() => setIsOrderFormOpen(true)}
              className="flex items-center space-x-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl hover:bg-zinc-800 transition-all font-bold shadow-lg shadow-zinc-200"
            >
              <Plus size={20} />
              <span>Novo Pedido</span>
            </button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {columns.map(col => (
                <div key={col.status} className="flex flex-col min-w-[300px] lg:w-1/5 shrink-0">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[col.status].color}`} />
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 font-mono italic">
                        {col.title}
                      </h3>
                    </div>
                    <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {orders.filter(o => o.status === col.status).length}
                    </span>
                  </div>
                  
                  <DroppableComponent droppableId={col.status}>
                    {(provided: DroppableProvided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="bg-zinc-100/50 p-3 rounded-[32px] space-y-4 min-h-[600px] border border-zinc-100 shadow-inner"
                      >
                        {orders.filter(o => o.status === col.status).map((order, index) => (
                          <DraggableComponent key={order.id} draggableId={order.id} index={index}>
                            {(provided: DraggableProvided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <KanbanCard 
                                  order={order} 
                                  onStatusChange={handleStatusChange}
                                  onClick={async (order) => {
                                    const prediction = await predictDelay(order, order.status);
                                    alert(`Insight IA Akanni: ${prediction}`);
                                  }}
                                  onIssueNfe={setNfeOrder}
                                  onEdit={handleEditOrder}
                                  onDelete={handleDeleteOrder}
                                />
                              </div>
                            )}
                          </DraggableComponent>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </DroppableComponent>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {activeTab === 'templates' && (
        <TemplatesManager 
          templates={templates}
          onAdd={handleCreateTemplate}
          onDelete={handleDeleteTemplate}
        />
      )}

      {activeTab === 'inventory' && (
        <InventoryList 
          items={stock} 
          onAddItem={handleAddStockItem}
          onUpdateItem={handleUpdateStockItem}
          onDeleteItem={handleDeleteStockItem}
          onUpdateQuantity={handleUpdateStockQuantity}
        />
      )}

      {activeTab === 'users' && (
        <UserManagement />
      )}

      {activeTab === 'settings' && (
        <Settings />
      )}

      {/* Forms & Popups */}
      {isOrderFormOpen && (
        <OrderForm 
          templates={templates}
          stock={stock}
          initialData={editingOrder}
          onClose={() => {
            setIsOrderFormOpen(false);
            setEditingOrder(null);
          }} 
          onSubmit={handleCreateOrder} 
        />
      )}

      <AnimatePresence>
        {nfeOrder && (
          <NfePopup 
            order={nfeOrder} 
            onClose={() => setNfeOrder(null)} 
            onSuccess={handleNfeSuccess}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <OrderBoard />
    </AuthProvider>
  );
}
