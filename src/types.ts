export type OrderStatus = 'pending' | 'cutting' | 'sewing' | 'finishing' | 'delivered';

export interface OrderItem {
  templateId: string;
  shirtType: string;
  quantity: number;
  fabricType: string;
  fabricColor: string;
  fabricUsagePerUnit: number;
  totalFabricEstimate: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerTaxId?: string;
  customerAddress?: string;
  status: OrderStatus;
  statusStartedAt?: any; // Firestore timestamp
  items: OrderItem[];
  deliveryDate: string;
  designImages?: string[]; // Array of base64 strings
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  photos: string[];
  notes?: string;
  isDelayed: boolean;
  nfeIssued: boolean;
}

export type StockType = 'fabric' | 'buttons' | 'thread' | 'label' | 'others';

export interface StockItem {
  id: string;
  name: string;
  type: StockType;
  color?: string;
  quantity: number;
  unit: 'meters' | 'units' | 'kg';
  minQuantity: number;
}

export type UserRole = 'super_admin' | 'admin_geral' | 'gerente_producao' | 'gestor_geral' | 'funcionario_padrao';

export interface UserProfile {
  id: string;
  uid: string;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  username?: string;
  tempPassword?: string;
}

export interface FabricTemplate {
  id: string;
  name: string;
  fabricConsumption: number;
}
