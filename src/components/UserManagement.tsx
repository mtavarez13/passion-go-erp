import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize secondary app safely for user creation to avoid logging out current admin
function getSecondaryAuth() {
  try {
    const existing = getApps().find(app => app.name === 'Secondary');
    if (existing) {
      return getAuth(existing);
    }
    const newApp = initializeApp(firebaseConfig, 'Secondary');
    return getAuth(newApp);
  } catch (e) {
    console.error('Error getting secondary auth:', e);
    return getAuth();
  }
}
import { UserProfile, Branch, Module, Franchise, DeliveryDriver } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Shield, 
  Building2, 
  CheckCircle2, 
  XCircle,
  Mail,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Package,
  Calculator,
  Zap,
  Store,
  Truck,
  Smartphone
} from 'lucide-react';

const MODULE_ICONS: Record<Module, any> = {
  whatsapp: MessageSquare,
  accounting: Receipt,
  inventory: Package,
  cash: Calculator,
  branches: Building2,
  packages: Receipt,
  'api-panel': Zap,
  franchises: Store,
  'delivery-drivers': Truck,
  'driver-portal': Smartphone
};

const MODULE_LABELS: Record<Module, string> = {
  whatsapp: 'WhatsApp',
  accounting: 'Contabilidad',
  inventory: 'Inventario',
  cash: 'Cierre de Caja',
  branches: 'Sucursales',
  packages: 'Paquetes & Facturación',
  'api-panel': 'Conexión APIs & 3PL',
  franchises: 'Franquicias & Puntos',
  'delivery-drivers': 'Repartidores Última Milla',
  'driver-portal': 'App Móvil Repartidor'
};

export default function UserManagement({ profile }: { profile: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    email: string;
    password?: string;
    role: 'Admin General' | 'Admin' | 'Operador' | 'Repartidor' | 'Franquicia';
    sede: string;
    franchiseId?: string;
    driverId?: string;
    enabledModules: Module[];
  }>({
    email: '',
    password: '',
    role: 'Operador',
    sede: '',
    franchiseId: '',
    driverId: '',
    enabledModules: ['whatsapp']
  });

  const isAdmin = profile.role === 'Admin General';

  if (!isAdmin) {
    return <div className="p-8 text-center text-zinc-500">Acceso restringido a administradores.</div>;
  }

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    });

    const unsubscribeBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    });

    const unsubscribeFranchises = onSnapshot(collection(db, 'franchises'), (snapshot) => {
      setFranchises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franchise)));
    });

    const unsubscribeDrivers = onSnapshot(collection(db, 'delivery_drivers'), (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryDriver)));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBranches();
      unsubscribeFranchises();
      unsubscribeDrivers();
    };
  }, []);

  const handleRoleChange = (newRole: 'Admin General' | 'Admin' | 'Operador' | 'Repartidor' | 'Franquicia') => {
    let defaultModules: Module[] = [];
    if (newRole === 'Admin General' || newRole === 'Admin') {
      defaultModules = ['whatsapp', 'accounting', 'inventory', 'cash', 'branches', 'packages', 'api-panel', 'franchises', 'delivery-drivers', 'driver-portal'];
    } else if (newRole === 'Repartidor') {
      defaultModules = ['driver-portal'];
    } else if (newRole === 'Franquicia') {
      defaultModules = ['packages', 'inventory'];
    } else {
      defaultModules = ['whatsapp', 'packages', 'cash', 'inventory'];
    }

    setFormData(prev => ({
      ...prev,
      role: newRole,
      enabledModules: defaultModules
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    try {
      if (editingId) {
        const { password, ...updateData } = formData;
        await updateDoc(doc(db, 'users', editingId), {
          ...updateData,
          updatedAt: new Date().toISOString()
        });

        // If password is provided, we update it via the backend API or create it if missing
        if (password) {
          try {
            const existingUser = users.find(u => (u as any).id === editingId);
            const idToken = await getAuth().currentUser?.getIdToken();
            if (!idToken) throw new Error('No se pudo obtener el token de autenticación.');

            if (existingUser?.uid) {
              const response = await fetch('/api/admin/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uid: existingUser.uid,
                  newPassword: password,
                  idToken
                })
              });

              const result = await response.json();
              if (!response.ok) {
                throw new Error(result.error || 'Error al actualizar la contraseña en el servidor.');
              }
            } else {
              const secAuth = getSecondaryAuth();
              const userCredential = await createUserWithEmailAndPassword(secAuth, formData.email, password);
              const user = userCredential.user;
              
              await updateDoc(doc(db, 'users', editingId), {
                uid: user.uid,
                updatedAt: new Date().toISOString()
              });
            }
          } catch (pwError: any) {
            console.error('Error managing password:', pwError);
            alert('El perfil se actualizó, pero hubo un error al gestionar la contraseña: ' + pwError.message);
          }
        }
      } else {
        if (!formData.password) {
          const { password, ...access } = formData;
          const email = formData.email.trim().toLowerCase();
          await setDoc(doc(db, 'user_access', email), {
            ...access, email, createdBy: profile.uid, createdAt: new Date().toISOString()
          });
          alert('Acceso autorizado. El usuario ya puede entrar con Google usando este correo.');
          resetForm();
          return;
        }

        const q = query(collection(db, 'users'), where('email', '==', formData.email));
        const existing = await getDocs(q);
        if (!existing.empty) {
          alert('Ya existe un usuario con este correo.');
          return;
        }

        const secAuth = getSecondaryAuth();
        const userCredential = await createUserWithEmailAndPassword(secAuth, formData.email, formData.password);
        const user = userCredential.user;

        const { password: _, ...profileData } = formData;
        await setDoc(doc(db, 'users', user.uid), {
          ...profileData,
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar usuario: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      email: '',
      password: '',
      role: 'Operador',
      sede: branches[0]?.nombre || '',
      franchiseId: '',
      driverId: '',
      enabledModules: ['whatsapp', 'packages', 'cash', 'inventory']
    });
  };

  const handleEdit = (user: UserProfile) => {
    setEditingId((user as any).id);
    setFormData({
      email: user.email,
      role: user.role,
      sede: user.sede || '',
      franchiseId: user.franchiseId || '',
      driverId: user.driverId || '',
      enabledModules: user.enabledModules || []
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este usuario?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  const toggleModule = (module: Module) => {
    setFormData(prev => {
      const next = [...prev.enabledModules];
      if (next.includes(module)) {
        return { ...prev, enabledModules: next.filter(m => m !== module) };
      } else {
        return { ...prev, enabledModules: [...next, module] };
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Gestión de Usuarios y Roles</h1>
          <p className="text-zinc-500 text-sm">Administra credenciales, accesos de administradores, operadores, franquicias y repartidores.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <Card className="p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Users className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <Input 
              label="Correo Electrónico" 
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@gmail.com"
              type="email"
              disabled={!!editingId}
              required
            />

            <Input 
              label="Contraseña (opcional; sin contraseña accede con Google)" 
              value={formData.password} 
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingId ? "Dejar en blanco para no cambiar" : "••••••••"}
              type="password"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Rol</label>
                <select 
                  value={formData.role}
                  onChange={e => handleRoleChange(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none font-medium"
                >
                  <option value="Operador">Operador</option>
                  <option value="Repartidor">Repartidor (Delivery)</option>
                  <option value="Franquicia">Franquicia (Punto Retiro)</option>
                  <option value="Admin">Admin (Sucursal)</option>
                  <option value="Admin General">Admin General (Global)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Sucursal Base</label>
                <select 
                  value={formData.sede}
                  onChange={e => setFormData({ ...formData, sede: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.nombre}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* If Repartidor, link to delivery driver profile */}
            {formData.role === 'Repartidor' && (
              <div className="flex flex-col gap-1.5 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <label className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1">
                  <Truck size={14} className="text-blue-600" />
                  Vincular Perfil de Repartidor
                </label>
                <select
                  value={formData.driverId}
                  onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="">Seleccionar repartidor...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.assignedSede} • Placa: {d.vehiclePlate || 'N/A'})</option>
                  ))}
                </select>
              </div>
            )}

            {/* If Franquicia, link to franchise profile */}
            {formData.role === 'Franquicia' && (
              <div className="flex flex-col gap-1.5 p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                <label className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1">
                  <Store size={14} className="text-purple-600" />
                  Vincular Franquicia / Punto
                </label>
                <select
                  value={formData.franchiseId}
                  onChange={e => setFormData({ ...formData, franchiseId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-purple-200 text-sm bg-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                >
                  <option value="">Seleccionar franquicia...</option>
                  {franchises.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code} • {f.city})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Módulos Habilitados</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {(Object.keys(MODULE_LABELS) as Module[]).map(module => {
                  const Icon = MODULE_ICONS[module];
                  const isEnabled = formData.enabledModules.includes(module);
                  return (
                    <button
                      key={module}
                      type="button"
                      onClick={() => toggleModule(module)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all text-left text-xs",
                        isEnabled 
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold" 
                          : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{MODULE_LABELS[module]}</span>
                      </div>
                      {isEnabled ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="opacity-20" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button type="submit" className="flex-1 font-bold">
                {editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              )}
            </div>
          </form>
        </Card>

        {/* List Section */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">Usuarios Registrados ({users.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Rol / Sede</th>
                  <th className="px-6 py-4">Módulos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(user => (
                  <tr key={(user as any).id} className="hover:bg-zinc-50 transition-all text-xs">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 shrink-0">
                          <Mail size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{user.email}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{user.uid || 'Pendiente de login'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-bold",
                          user.role === 'Admin General' ? "bg-purple-100 text-purple-800" :
                          user.role === 'Admin' ? "bg-blue-100 text-blue-800" :
                          user.role === 'Repartidor' ? "bg-emerald-100 text-emerald-800" :
                          user.role === 'Franquicia' ? "bg-amber-100 text-amber-800" :
                          "bg-zinc-100 text-zinc-700"
                        )}>
                          {user.role}
                        </span>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Building2 size={11} /> {user.sede || 'Sin Sede'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.enabledModules?.map(m => (
                          <div key={m} className="p-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/50" title={MODULE_LABELS[m] || m}>
                            {React.createElement(MODULE_ICONS[m] || Package, { size: 13 })}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete((user as any).id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
