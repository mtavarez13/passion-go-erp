import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { Branch, UserProfile } from '../types';
import { Card, Button, Input } from './ui';
import { Plus, Trash2, MapPin, User, Phone, Tag, Save, X } from 'lucide-react';

export default function BranchManagement({ profile }: { profile: UserProfile }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Branch, 'id'>>({
    nombre: '',
    direccion: '',
    repartidorNombre: '',
    repartidorTelefono: '',
    zonas: []
  });
  const [newZone, setNewZone] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'branches'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const branchList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(branchList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.nombre || !formData.direccion) return alert('Nombre y dirección son requeridos');
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'branches', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'branches'), formData);
      }
      setFormData({
        nombre: '',
        direccion: '',
        repartidorNombre: '',
        repartidorTelefono: '',
        zonas: []
      });
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setFormData({
      nombre: branch.nombre,
      direccion: branch.direccion,
      repartidorNombre: branch.repartidorNombre,
      repartidorTelefono: branch.repartidorTelefono,
      zonas: branch.zonas || []
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta sucursal?')) {
      await deleteDoc(doc(db, 'branches', id));
    }
  };

  const addZone = () => {
    if (!newZone.trim()) return;
    if (formData.zonas.includes(newZone.trim())) return alert('Esta zona ya existe');
    setFormData({ ...formData, zonas: [...formData.zonas, newZone.trim()] });
    setNewZone('');
  };

  const removeZone = (zone: string) => {
    setFormData({ ...formData, zonas: formData.zonas.filter(z => z !== zone) });
  };

  const isAdmin = profile.role === 'Admin General' || profile.role === 'Admin';

  if (!isAdmin) {
    return <div className="p-8 text-center text-zinc-500">Acceso restringido a administradores.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Gestión de Sucursales</h1>
        <p className="text-zinc-500">Configura las sedes y asigna zonas para la facturación automática.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <Card className="p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Plus className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Nombre de la Sede</label>
              <Input 
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Dajabón"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Dirección</label>
              <Input 
                value={formData.direccion}
                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle Duarte #12..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Repartidor</label>
                <Input 
                  value={formData.repartidorNombre}
                  onChange={e => setFormData({ ...formData, repartidorNombre: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Teléfono</label>
                <Input 
                  value={formData.repartidorTelefono}
                  onChange={e => setFormData({ ...formData, repartidorTelefono: e.target.value })}
                  placeholder="809-..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Zonas Asignadas</label>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={newZone}
                  onChange={e => setNewZone(e.target.value)}
                  placeholder="Nombre de zona"
                  onKeyDown={e => e.key === 'Enter' && addZone()}
                />
                <Button onClick={addZone} variant="secondary" className="px-3">
                  <Plus size={20} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.zonas.map(zone => (
                  <span key={zone} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md text-xs font-medium">
                    {zone}
                    <button onClick={() => removeZone(zone)} className="hover:text-red-500">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                <Save size={18} className="mr-2" />
                {editingId ? 'Actualizar' : 'Crear Sucursal'}
              </Button>
              {editingId && (
                <Button onClick={() => {
                  setEditingId(null);
                  setFormData({ nombre: '', direccion: '', repartidorNombre: '', repartidorTelefono: '', zonas: [] });
                }} variant="secondary">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          {branches.map(branch => (
            <Card key={branch.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                      {branch.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 text-lg">{branch.nombre}</h3>
                      <p className="text-sm text-zinc-500 flex items-center gap-1">
                        <MapPin size={14} /> {branch.direccion}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Repartidor</p>
                      <p className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                        <User size={14} /> {branch.repartidorNombre}
                      </p>
                      <p className="text-sm text-zinc-500 flex items-center gap-2">
                        <Phone size={14} /> {branch.repartidorTelefono}
                      </p>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Zonas</p>
                      <div className="flex flex-wrap gap-1">
                        {branch.zonas?.map(z => (
                          <span key={z} className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-medium text-zinc-600">
                            {z}
                          </span>
                        ))}
                        {(!branch.zonas || branch.zonas.length === 0) && <p className="text-xs text-zinc-400 italic">Sin zonas</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button onClick={() => handleEdit(branch)} variant="secondary" className="p-2 h-auto">
                    <Tag size={18} />
                  </Button>
                  <Button onClick={() => handleDelete(branch.id)} variant="secondary" className="p-2 h-auto text-zinc-300 hover:text-red-500">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {branches.length === 0 && !loading && (
            <div className="text-center py-12 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
              <MapPin size={48} className="mx-auto text-zinc-200 mb-4" />
              <p className="text-zinc-500">No hay sucursales configuradas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
