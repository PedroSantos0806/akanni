import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
  where,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, loginEmail, registerEmail, auth } from './lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Order, OrderStatus, StockItem, FabricTemplate } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { StatsOverview } from './components/StatsOverview';
import { KanbanCard } from './components/KanbanCard';
import { InventoryList } from './components/InventoryList';
import { OrderForm } from './components/OrderForm';
import { NfePopup } from './components/NfePopup';
import { TemplatesManager } from './components/TemplatesManager';
import { Plus, Loader2, LogIn, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { predictDelay } from './services/aiService';

import { UserManagement } from './components/UserManagement';
import { Settings } from './components/Settings';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DroppableProvided } from '@hello-pangea/dnd';
import { STATUS_CONFIG } from './constants';

const DraggableComponent = Draggable as any;
const DroppableComponent = Droppable as any;

const OrderBoard = () => {
  const { user, profile } = useAuth();
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
  const [authError, setAuthError] = useState('');
  // Modals state
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [nfeOrder, setNfeOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;

    const ordersQuery = query(collection(db, 'orders'));
    const stockQuery = query(collection(db, 'stock'));
    const templatesQuery = query(collection(db, 'templates'));

    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
      setLoading(false);
    }, (err) => {
      console.error("Order snapshot error:", err);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'orders');
    });

    const unsubStock = onSnapshot(stockQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
      setStock(data);
    }, (err) => {
      console.error("Stock snapshot error:", err);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'stock');
    });

    const unsubTemplates = onSnapshot(templatesQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FabricTemplate));
      setTemplates(data);
    }, (err) => {
      console.error("Templates snapshot error:", err);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'templates');
    });

    return () => {
      unsubOrders();
      unsubStock();
      unsubTemplates();
    };
  }, [user]);

  useEffect(() => {
    if (user && (user.email === 'pedrohenrique0806@gmail.com' || user.email === 'ai.auroratech@gmail.com')) {
      const hasWiped = localStorage.getItem('akanni_v4_reset');
      if (!hasWiped) {
        const wipeAll = async () => {
          try {
            console.log('Starting total database reset...');
            // Users (except self)
            const uSnap = await getDocs(collection(db, 'users'));
            for (const d of uSnap.docs) {
              if (d.id !== user.email && d.data().email !== user.email) await deleteDoc(d.ref);
            }
            // Stock
            const sSnap = await getDocs(collection(db, 'stock'));
            for (const d of sSnap.docs) await deleteDoc(d.ref);
            // Orders
            const oSnap = await getDocs(collection(db, 'orders'));
            for (const d of oSnap.docs) await deleteDoc(d.ref);
            // Templates
            const tSnap = await getDocs(collection(db, 'templates'));
            for (const d of tSnap.docs) await deleteDoc(d.ref);

            localStorage.setItem('akanni_v4_reset', 'true');
            console.log('Database reset successful! Everything is clean for fresh use.');
          } catch (err) {
            console.error('Wipe Error:', err);
          }
        };
        wipeAll();
      }
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !password) {
      setAuthError('Digite seu usuário e senha.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const finalPassword = password.trim();
    
    // Master Admin Login Logic
    const isNewPedro = trimmedEmail === 'pedrohenrique0806@gmail.com' || 
                       trimmedEmail === 'pedro santos' || 
                       trimmedEmail === 'pedro henrique';
    const effectiveEmail = isNewPedro ? 'pedrohenrique0806@gmail.com' : (trimmedEmail.includes('@') ? trimmedEmail : `${trimmedEmail}@akanni.com`);

    try {
      // 1. Try to Login
      try {
        await loginEmail(effectiveEmail, finalPassword);
      } catch (loginErr: any) {
        // 2. If login fails (user might not exist in Auth yet)
        if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
          
          const isMaster = effectiveEmail === 'ai.auroratech@gmail.com';
          const userDoc = await getDoc(doc(db, 'users', effectiveEmail));

          // Authorization: Pre-authorized in Firestore OR Master Accounts
          if (userDoc.exists() || isNewPedro || isMaster) {
            
            // Initial Activation Password for Pedro
            if (isNewPedro && !userDoc.exists() && finalPassword !== 'adminakanni') {
              setAuthError('Senha de ativação incorreta para o administrador.');
              return;
            }

            if (finalPassword.length < 6) {
              setAuthError('Escolha uma senha de no mínimo 6 caracteres.');
              return;
            }

            try {
              const res = await registerEmail(effectiveEmail, finalPassword);
              const userRef = doc(db, 'users', effectiveEmail);
              
              await setDoc(userRef, {
                uid: res.user.uid,
                email: effectiveEmail,
                username: isNewPedro ? 'pedro santos' : (userDoc.data()?.username || effectiveEmail.split('@')[0]),
                displayName: isNewPedro ? 'Pedro Santos' : (userDoc.data()?.displayName || effectiveEmail.split('@')[0]),
                role: (isNewPedro || isMaster) ? 'super_admin' : (userDoc.data()?.role || 'funcionario_padrao'),
                updatedAt: serverTimestamp()
              }, { merge: true });
              
              return; 
            } catch (regErr: any) {
              if (regErr.code === 'auth/email-already-in-use') {
                setAuthError('Usuário já ativado. Verifique sua senha.');
                return;
              }
              throw regErr;
            }
          }
        }
        throw loginErr;
      }
    } catch (err: any) {
      console.error('Auth Error Final:', err.code, err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError('Senha incorreta. Verifique se digitou corretamente ou use o link abaixo.');
      } else if (err.code === 'auth/user-not-found') {
        setAuthError('Usuário não autorizado no sistema. Fale com Pedro Santos.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
      } else {
        setAuthError('Erro no acesso: ' + (err.message || 'Tente novamente.'));
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('Digite seu e-mail/usuário para receber o link de redefinição.');
      return;
    }
    let finalEmail = email;
    if (!email.includes('@')) finalEmail = `${email}@akanni.com`;

    try {
      await sendPasswordResetEmail(auth, finalEmail);
      alert(`Um link de redefinição foi enviado para ${finalEmail}. Verifique sua caixa de entrada (e spam).`);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setAuthError('E-mail não encontrado no sistema.');
      } else {
        setAuthError('Erro ao enviar e-mail de redefinição.');
      }
    }
  };

  const handleCreateTemplate = async (name: string, consumption: number) => {
    try {
      await addDoc(collection(db, 'templates'), { name, fabricConsumption: consumption });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'templates');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `templates/${id}`);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await updateDoc(orderRef, { 
        status: newStatus,
        statusStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
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
      if (editingOrder) {
        // Update logic
        const ref = doc(db, 'orders', editingOrder.id);
        await updateDoc(ref, {
          ...orderData,
          updatedAt: serverTimestamp()
        });
        setEditingOrder(null);
        setIsOrderFormOpen(false);
        return;
      }

      await runTransaction(db, async (transaction) => {
        // 1. Create order
        const ordersRef = collection(db, 'orders');
        const newOrderDoc = doc(ordersRef);
        transaction.set(newOrderDoc, {
          ...orderData,
          statusStartedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Subtract from stock for EACH item in order
        if (orderData.items) {
          for (const item of orderData.items) {
            // Find specific matching fabric (by name and color if possible)
            const fabric = stock.find(s => 
              s.type === 'fabric' && 
              s.name === item.fabricType && 
              (!item.fabricColor || s.color === item.fabricColor)
            );

            if (fabric && item.totalFabricEstimate) {
              const stockRef = doc(db, 'stock', fabric.id);
              transaction.update(stockRef, {
                quantity: increment(-item.totalFabricEstimate)
              });
            }
          }
        }
      });
      
      setIsOrderFormOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders/transaction');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsOrderFormOpen(true);
  };

  const handleAddStockItem = async (data: Partial<StockItem>) => {
    try {
      await addDoc(collection(db, 'stock'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stock');
    }
  };

  const handleUpdateStockItem = async (id: string, data: Partial<StockItem>) => {
    try {
      const ref = doc(db, 'stock', id);
      await updateDoc(ref, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stock/${id}`);
    }
  };

  const handleDeleteStockItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stock', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stock/${id}`);
    }
  };

  const handleUpdateStockQuantity = async (id: string, delta: number) => {
    try {
      const ref = doc(db, 'stock', id);
      await updateDoc(ref, { quantity: increment(delta) });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stock/${id}`);
    }
  };

  const handleNfeSuccess = async (orderId: string) => {
    try {
      const ref = doc(db, 'orders', orderId);
      await updateDoc(ref, { nfeIssued: true, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const columns: { title: string; status: OrderStatus }[] = [
    { title: 'Pendentes', status: 'pending' },
    { title: 'Corte', status: 'cutting' },
    { title: 'Costura', status: 'sewing' },
    { title: 'Acabamento', status: 'finishing' },
    { title: 'Despachado', status: 'delivered' },
  ];

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-zinc-100 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-8 shadow-xl">AK</div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tighter">Akanni Confecções</h1>
          <p className="text-zinc-500 mb-8 font-medium italic">Alfaiataria Industrial Inteligente</p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">E-mail ou Usuário</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="seu@email.com ou usuario"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{authError}</p>}

            <button 
              type="submit"
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all mt-4"
            >
              <LogIn size={20} className="mr-3" />
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

          <div className="mt-8 pt-8 border-t border-zinc-50">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Desenvolvido para Akanni Confecções</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-zinc-900" size={48} />
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
