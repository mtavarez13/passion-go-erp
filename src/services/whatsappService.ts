import { Branch, WhatsAppPackage } from '../types';

export const generateWhatsAppMessage = (pkg: WhatsAppPackage, branch: Branch) => {
  return `Hola ${pkg.cliente}, tu paquete de ${pkg.tienda} (${pkg.articulo}) ya está disponible en la sucursal de ${branch.nombre}.
Costo: RD$${pkg.cod}
Dirección: ${branch.direccion}
Repartidor: ${branch.repartidorNombre} (${branch.repartidorTelefono})
¡Te esperamos!`;
};

export const getWhatsAppLink = (telefono: string, mensaje: string) => {
  const cleanPhone = telefono.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(mensaje);
  // Using whatsapp:// protocol to force desktop app
  return `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
};

export const sendSequentialMessages = async (
  packages: WhatsAppPackage[], 
  branches: Branch[],
  onProgress: (index: number) => void
) => {
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const branch = branches.find(b => b.nombre === pkg.sede);
    if (!branch) {
      console.warn(`Branch not found for package ${pkg.id} (sede: ${pkg.sede})`);
      continue;
    }
    const message = generateWhatsAppMessage(pkg, branch);
    const link = getWhatsAppLink(pkg.telefono, message);
    
    // Open WhatsApp Desktop
    window.open(link, '_self');
    
    onProgress(i + 1);
    
    // Wait 5 seconds before next message
    if (i < packages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
