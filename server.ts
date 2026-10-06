import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
// Note: In Cloud Run, it should pick up credentials automatically if configured.
// For local/preview, we might need a service account, but we'll try with projectId.
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // ==========================================
  // LAST-MILE CARRIER API SUITE (DHL, FEDEX, MAILAMERICAS, GOFO, ETC.)
  // ==========================================

  // Helper function to log API requests
  const logApiEvent = async (data: {
    method: string;
    endpoint: string;
    carrierName: string;
    statusCode: number;
    durationMs: number;
    payloadSummary: string;
    trackingCode?: string;
    statusText: 'success' | 'error' | 'warning';
  }) => {
    try {
      const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
      await db.collection("api_logs").add({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Could not write api_log:", e);
    }
  };

  // 1. Ingest Package from Carrier (DHL, FedEx, MailAmericas, Gofo, etc.)
  app.post("/api/v1/last-mile/ingest", async (req, res) => {
    const startTime = Date.now();
    const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.toString().replace("Bearer ", "");
    
    // In demo/open mode or with API key
    const {
      trackingNumber,
      carrier,
      customerName,
      customerPhone,
      destinationAddress,
      destinationZone,
      packageItem,
      declaredValue,
      serviceType,
      targetBranch,
      notes
    } = req.body;

    if (!trackingNumber || !customerName) {
      const duration = Date.now() - startTime;
      await logApiEvent({
        method: "POST",
        endpoint: "/api/v1/last-mile/ingest",
        carrierName: carrier || "Unknown",
        statusCode: 400,
        durationMs: duration,
        payloadSummary: "Missing trackingNumber or customerName",
        statusText: "error"
      });
      return res.status(400).json({
        success: false,
        error: "Missing required fields: trackingNumber and customerName are required."
      });
    }

    try {
      const db = admin.firestore(firebaseConfig.firestoreDatabaseId);

      // Check if default branch exists
      const targetSede = targetBranch || "Dajabón";
      
      const newPackage = {
        cod: trackingNumber.trim().toUpperCase(),
        cliente: customerName.trim(),
        telefono: customerPhone ? customerPhone.trim() : "",
        tienda: carrier ? carrier.trim() : "Transportista Externo",
        zona: destinationZone || destinationAddress || "Última Milla",
        nota: notes || `Ingreso API Última Milla (${carrier || 'Carrier'}) - ${serviceType || 'Entrega Domicilio'}`,
        articulo: packageItem || "Paquete Courier",
        costo: declaredValue ? Number(declaredValue) : 150,
        sede: targetSede,
        estado: "Abierto",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ingest into packages collection
      const docRef = await db.collection("packages").add(newPackage);

      // Increment sync counter for carrier if integration exists
      try {
        const carrierDocs = await db.collection("carrier_integrations")
          .where("name", "==", carrier)
          .get();
        if (!carrierDocs.empty) {
          const cDoc = carrierDocs.docs[0];
          const curr = cDoc.data().totalSyncedPackages || 0;
          await cDoc.ref.update({
            totalSyncedPackages: curr + 1,
            lastSyncAt: new Date().toISOString()
          });
        }
      } catch (err) {
        // ignore counter error
      }

      const duration = Date.now() - startTime;
      await logApiEvent({
        method: "POST",
        endpoint: "/api/v1/last-mile/ingest",
        carrierName: carrier || "External API",
        statusCode: 201,
        durationMs: duration,
        payloadSummary: `Paquete ingresado: ${newPackage.cod} para ${newPackage.cliente} (${newPackage.sede})`,
        trackingCode: newPackage.cod,
        statusText: "success"
      });

      return res.status(201).json({
        success: true,
        message: "Paquete registrado con éxito para distribución de última milla.",
        packageId: docRef.id,
        trackingCode: newPackage.cod,
        assignedBranch: targetSede,
        status: "Abierto / En Almacén",
        eta: "24-48 horas",
        lastMileProvider: "Passion Go Logistics"
      });
    } catch (error: any) {
      console.error("Error ingesting last mile package:", error);
      const duration = Date.now() - startTime;
      await logApiEvent({
        method: "POST",
        endpoint: "/api/v1/last-mile/ingest",
        carrierName: carrier || "External API",
        statusCode: 500,
        durationMs: duration,
        payloadSummary: `Error: ${error.message}`,
        statusText: "error"
      });
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Query Status / Tracking for Carrier
  app.get("/api/v1/last-mile/status/:trackingNumber", async (req, res) => {
    const startTime = Date.now();
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).json({ success: false, error: "Tracking number is required" });
    }

    try {
      const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
      const querySnap = await db.collection("packages")
        .where("cod", "==", trackingNumber.trim().toUpperCase())
        .get();

      if (querySnap.empty) {
        const duration = Date.now() - startTime;
        await logApiEvent({
          method: "GET",
          endpoint: `/api/v1/last-mile/status/${trackingNumber}`,
          carrierName: "Status API",
          statusCode: 404,
          durationMs: duration,
          payloadSummary: `Tracking no encontrado: ${trackingNumber}`,
          trackingCode: trackingNumber,
          statusText: "warning"
        });
        return res.status(404).json({
          success: false,
          error: "Tracking code not found in Passion Go network"
        });
      }

      const pkgData = querySnap.docs[0].data();
      const duration = Date.now() - startTime;

      await logApiEvent({
        method: "GET",
        endpoint: `/api/v1/last-mile/status/${trackingNumber}`,
        carrierName: pkgData.tienda || "Status API",
        statusCode: 200,
        durationMs: duration,
        payloadSummary: `Consulta de estado: ${trackingNumber} -> ${pkgData.estado}`,
        trackingCode: trackingNumber,
        statusText: "success"
      });

      return res.json({
        success: true,
        trackingNumber: pkgData.cod,
        recipient: pkgData.cliente,
        carrier: pkgData.tienda,
        currentStatus: pkgData.estado, // 'Abierto' | 'Entregado' | 'Pagado'
        statusDescription: pkgData.estado === 'Pagado' 
          ? 'Entregado al cliente y liquidado con éxito' 
          : pkgData.estado === 'Entregado' 
          ? 'En ruta de reparto de última milla' 
          : 'En centro de distribución / Clasificado en sucursal',
        branch: pkgData.sede,
        destinationZone: pkgData.zona,
        feeAmountRD: pkgData.costo,
        updatedAt: pkgData.updatedAt || pkgData.createdAt
      });
    } catch (error: any) {
      console.error("Error retrieving status:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Webhook endpoint for Carrier dispatch callbacks
  app.post("/api/v1/last-mile/webhook", async (req, res) => {
    const startTime = Date.now();
    const event = req.body;

    const carrier = event.carrier || "Webhook Dispatcher";
    const duration = Date.now() - startTime;

    await logApiEvent({
      method: "POST",
      endpoint: "/api/v1/last-mile/webhook",
      carrierName: carrier,
      statusCode: 200,
      durationMs: duration,
      payloadSummary: `Webhook recibido: evento=${event.event || 'shipment.created'} | tracking=${event.trackingNumber || 'N/A'}`,
      trackingCode: event.trackingNumber,
      statusText: "success"
    });

    return res.json({
      received: true,
      timestamp: new Date().toISOString(),
      status: "processed"
    });
  });

  // API to update user password
  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword, idToken } = req.body;

    if (!uid || !newPassword || !idToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;

      // Check if the requester is an admin in Firestore
      const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
      const userDoc = await db.collection("users").doc(requesterUid).get();
      const userData = userDoc.data();

      if (!userData || (userData.role !== "Admin General" && userData.role !== "Admin")) {
        return res.status(403).json({ error: "Unauthorized: Only admins can update passwords" });
      }

      // Update the user's password in Auth
      await admin.auth().updateUser(uid, {
        password: newPassword,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
