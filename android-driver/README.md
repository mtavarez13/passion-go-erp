# Passion Go Repartidores — Android 1.0

App Android nativa, sin WebView, con el icono de moto del ERP. Compatible con Android 8 o superior. Inicio de sesión por correo y contraseña; solo acepta usuarios con rol `Repartidor`. No incluye registro libre, Google ni acceso a módulos administrativos.

## Configuración desde el ERP

1. Crear el repartidor en **Repartidores Última Milla** y definir sucursal, zonas y estado activo.
2. En **Usuarios & Roles**, crear una cuenta con correo/contraseña, rol **Repartidor** y vincularla al perfil anterior mediante `driverId`.
3. Usar exactamente los mismos nombres de zona en las órdenes y en las zonas asignadas al repartidor.
4. Habilitar Correo/contraseña en Firebase Authentication del proyecto `erp-passion`.
5. Publicar `firestore.rules` en la base `(default)` de ese proyecto antes de distribuir:

   `firebase deploy --only firestore:rules --project erp-passion`

Las órdenes se consultan por sucursal y zona, y las reglas validan ambas. Cambiar una zona en el ERP afecta la próxima actualización de la app. Si se revoca el rol o se inactiva el perfil, Firebase rechaza nuevas consultas. No se guardan tokens ni contraseñas en disco. La sesión requiere nuevo acceso al expirar.

## Funciones de esta versión

- Ver órdenes de todas las zonas configuradas de su sucursal, con cliente, código, estado y nota.
- Actualización manual; sin órdenes de demostración.
- Llamar, abrir WhatsApp y consultar la zona en el mapa.
- Cerrar sesión.

Esta versión es de consulta de órdenes; no permite confirmar entregas, capturar fotos, firma ni trabajar sin conexión. El mapa abre la zona, no una dirección GPS exacta.

## Compilación

Ejecutar `./android-driver/build.ps1` desde PowerShell con Android SDK y el JDK de Android Studio instalados. El script genera `android-driver/build/Passion-Go-Repartidores.apk`, firmado con la clave de depuración local. Es un APK de prueba instalable; una publicación en Play Store requiere firma de producción y AAB.
