export type Sede = string;

export interface Branch {
  id: string;
  nombre: string;
  direccion: string;
  repartidorNombre: string;
  repartidorTelefono: string;
  zonas: string[]; // List of zones assigned to this branch
}

export interface SedeConfig {
  id: string;
  direccion: string;
  repartidorNombre: string;
  repartidorTelefono: string;
}

export interface Franchise {
  id: string;
  code: string; // e.g. "FQ-DAJ-01"
  name: string; // e.g. "Franquicia Dajabón Centro / Pick-Up Point"
  type: 'pickup_point' | 'franchise_hub' | 'delivery_agency';
  managerName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  city: string;
  province: string;
  assignedSede: Sede;
  coverageZones: string[];
  commissionPerPackage: number;
  status: 'active' | 'inactive' | 'pending';
  openingHours?: string;
  totalPackagesReceived?: number;
  totalPackagesDelivered?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cedula?: string;
  accessPin?: string; // 4-6 digit quick access PIN
  loginEmail?: string; // Auth email for direct driver login
  authUid?: string; // Firebase Auth UID if created
  vehicleType: 'motorcycle' | 'van' | 'car' | 'bicycle' | 'light_truck';
  vehiclePlate?: string;
  assignedSede: Sede;
  assignedFranchiseId?: string;
  assignedFranchiseName?: string;
  assignedZones: string[];
  status: 'active' | 'on_route' | 'off_duty' | 'inactive';
  activeDeliveriesCount?: number;
  totalDeliveredCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppPackage {
  id: string;
  cod: string;
  tienda: string;
  zona: string;
  nota: string;
  cliente: string;
  telefono: string;
  sede: Sede;
  estado: 'Abierto' | 'Entregado' | 'Pagado';
  createdAt: string;
  updatedAt: string;
  costo: number;
  articulo: string;
  proveedor?: string;
  
  // Last-mile Delivery & Franchise extensions
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedFranchiseId?: string;
  assignedFranchiseName?: string;
  deliveryType?: 'home_delivery' | 'pickup_point';
  deliveryStatus?: 'unassigned' | 'assigned' | 'in_transit' | 'delivered' | 'rescheduled' | 'failed' | 'ready_for_pickup';
  deliveryProofPhoto?: string; // base64 or URL
  signaturePhoto?: string; // base64 canvas signature
  recipientIdCard?: string;
  recipientReceivedName?: string;
  deliveredAt?: string;
  rescheduledDate?: string;
  rescheduledTimeWindow?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  rescheduleReason?: string;
  rescheduleHistory?: {
    date: string;
    newScheduledDate: string;
    timeWindow?: string;
    reason: string;
    notes?: string;
    driverName: string;
    createdAt: string;
  }[];
  deliveryNotes?: string;
  collectedAmount?: number;
  paymentMethodCollected?: 'cash' | 'transfer' | 'card' | 'already_paid';
}

export interface Provider {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  sede: Sede;
}

export interface Transaction {
  id: string;
  tipo: 'Ingreso' | 'Gasto';
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: string;
  sede: Sede;
  facturaUrl?: string;
  facturaData?: {
    monto: number;
    proveedor: string;
    fecha: string;
    numeroFactura: string;
  };
  estado?: 'Pendiente' | 'Pagado';
}

export interface BlumboxPackage {
  id: string;
  tracking: string;
  cliente: string;
  status: 'Disponible';
  sede: Sede;
  checked: boolean;
  valor?: number;
}

export type Module = 
  | 'whatsapp' 
  | 'accounting' 
  | 'inventory' 
  | 'cash' 
  | 'branches' 
  | 'packages' 
  | 'api-panel'
  | 'franchises'
  | 'delivery-drivers'
  | 'driver-portal';

export interface CarrierIntegration {
  id: string;
  name: string; // e.g. "DHL Express", "FedEx", "MailAmericas", "Gofo Express", "UPS", "Generic Carrier"
  slug: 'dhl' | 'fedex' | 'mailamericas' | 'gofo' | 'ups' | 'custom';
  logoUrl?: string; // URL HTTPS o imagen cargada como data URL
  logoColor: string;
  status: 'active' | 'inactive' | 'testing';
  apiKey: string;
  apiSecret?: string;
  environment: 'sandbox' | 'production';
  webhookUrl: string;
  webhookSecret?: string;
  defaultSede: Sede;
  autoNotifyWhatsApp: boolean;
  serviceType: 'last_mile_delivery' | 'pickup_point' | 'hub_sorting' | 'all';
  ratePerKg?: number;
  totalSyncedPackages?: number;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  carrierSlug: string;
  keyPrefix: string;
  hashedSecret?: string;
  fullKey: string;
  scopes: ('read:tracking' | 'write:packages' | 'sync:status' | 'webhooks')[];
  status: 'active' | 'revoked';
  rateLimitPerMinute: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ApiLogRecord {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  carrierName: string;
  statusCode: number;
  ipAddress?: string;
  durationMs: number;
  payloadSummary: string;
  trackingCode?: string;
  statusText: 'success' | 'error' | 'warning';
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'Admin General' | 'Admin' | 'Operador' | 'Repartidor' | 'Franquicia';
  sede?: Sede;
  enabledModules?: Module[];
  driverId?: string;
  franchiseId?: string;
  displayName?: string;
  phone?: string;
}
