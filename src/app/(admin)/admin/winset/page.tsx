// src/app/(admin)/admin/winset/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { AlertTriangle, Loader2, CalendarClock, CheckCircle, Package, Download } from "lucide-react";

type ItemAlerta = {
  id: string;
  nombre: string;
  lote: string;
  caducidad: string; 
  cantidad: number;
  coffiNombre: string;
  coffiId: string;
  coffiPos: string;
  diasRestantes: number;
  estadoAlerta: "critico" | "precaucion" | "ok";
  fechaReporte: Date;
};

export default function AlertasWinsetPage() {
  const { userData, loading: authLoading } = useAuth();
  const [inventarioGlobal, setInventarioGlobal] = useState<ItemAlerta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (authLoading || !userData) return;

    const fetchDatos = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const listaUsuarios: any[] = [];
        usersSnap.forEach(doc => listaUsuarios.push({ ...doc.data(), uid: doc.id }));

        const qWinset = query(collection(db, "reports_winset"), orderBy("fechaRegistro", "desc"));
        const winsetSnap = await getDocs(qWinset);
        
        const reportesMasRecientes = new Map();
        winsetSnap.forEach(doc => {
          const data = doc.data();
          if (!reportesMasRecientes.has(data.coffiId)) {
            reportesMasRecientes.set(data.coffiId, { ...data, id: doc.id });
          }
        });

        let todosLosLotes: ItemAlerta[] = [];
        const hoy = new Date();

        reportesMasRecientes.forEach((reporte) => {
          const promotor = listaUsuarios.find(u => u.uid === reporte.coffiId);
          if (!promotor) return;

          // ¡CORRECCIÓN AQUÍ! Leemos el arreglo 'inventario' basado en tu captura de Firebase
          const items = reporte.inventario || [];

          items.forEach((item: any) => {
            if (!item.caducidad || item.cantidad <= 0) return;

            const fechaCaducidad = new Date(item.caducidad);
            const diferenciaTiempo = fechaCaducidad.getTime() - hoy.getTime();
            const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

            let estadoAlerta: "critico" | "precaucion" | "ok" = "ok";
            if (diasRestantes <= 0) estadoAlerta = "critico"; 
            else if (diasRestantes <= 30) estadoAlerta = "precaucion"; 

            todosLosLotes.push({
              // ¡CORRECCIÓN AQUÍ! Mapeamos tus campos reales (modelo, id)
              id: item.id || "N/A",
              nombre: item.modelo || item.linea || "Desconocido", 
              lote: item.id || "N/A", // Usamos tu 'id' como identificador de lote/SKU
              caducidad: item.caducidad,
              cantidad: item.cantidad,
              coffiNombre: promotor.nombre,
              coffiId: reporte.coffiId,
              coffiPos: promotor.pos || "Sin POS",
              diasRestantes,
              estadoAlerta,
              fechaReporte: reporte.fechaRegistro?.toDate() || new Date()
            });
          });
        });

        if (userData.rol === "supervisor") {
          const misCoffisIds = listaUsuarios.filter(u => u.supervisorId === userData.uid).map(u => u.uid);
          todosLosLotes = todosLosLotes.filter(lote => misCoffisIds.includes(reportesMasRecientes.get(lote.coffiId)?.coffiId));
        } else if (userData.rol === "gerente") {
          const miRegion = userData.region?.trim().toLowerCase() || "";
          const esNacional = miRegion === "nacional" || miRegion === "todas";
          const miRegionCoffisIds = listaUsuarios.filter(u => esNacional || u.region?.trim().toLowerCase() === miRegion).map(u => u.uid);
          todosLosLotes = todosLosLotes.filter(lote => miRegionCoffisIds.includes(reportesMasRecientes.get(lote.coffiId)?.coffiId));
        }

        todosLosLotes.sort((a, b) => a.diasRestantes - b.diasRestantes);
        setInventarioGlobal(todosLosLotes);
      } catch (error) {
        console.error("Error al cargar Winset:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [userData, authLoading]);

  const exportarAExcel = () => {
    if (inventarioGlobal.length === 0) return alert("No hay datos para exportar.");
    const cabeceras = ["Boutique (POS)", "Promotor", "Máquina / Línea", "SKU / ID", "Caducidad", "Stock Actual", "Estatus"];
    const filas = inventarioGlobal.map(i => {
      const estatusStr = i.estadoAlerta === "critico" ? "CADUCADO" : i.estadoAlerta === "precaucion" ? "PROXIMO A VENCER" : "VIGENTE";
      return `"${i.coffiPos}","${i.coffiNombre}","${i.nombre}","${i.lote}","${i.caducidad}","${i.cantidad}","${estatusStr}"`;
    });
    const contenidoCSV = "sep=,\n" + [cabeceras.join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Alertas_Winset_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || cargando) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <header>
          <h1 className="text-3xl font-bold text-nespresso-dark flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={32} />
            Alertas Winset (Degustación)
          </h1>
          <p className="text-gray-500 mt-1">Monitorea los lotes y caducidades del inventario en piso de ventas.</p>
        </header>

        {(userData?.rol === "super_admin" || userData?.rol === "supervisor") && (
          <button 
            onClick={exportarAExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={18} /> Exportar Inventario (.csv)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Lotes Vigentes</p>
          <p className="text-3xl font-black text-nespresso-dark mt-1">
            {inventarioGlobal.filter(i => i.estadoAlerta === "ok").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-400">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock size={16} className="text-yellow-500"/> Próximos a vencer
          </p>
          <p className="text-3xl font-black text-yellow-600 mt-1">
            {inventarioGlobal.filter(i => i.estadoAlerta === "precaucion").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500"/> Mermas / Caducados
          </p>
          <p className="text-3xl font-black text-red-600 mt-1">
            {inventarioGlobal.filter(i => i.estadoAlerta === "critico").length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-5 font-bold">Estado</th>
                <th className="p-5 font-bold">Boutique / Promotor</th>
                <th className="p-5 font-bold">Máquina (SKU)</th>
                <th className="p-5 font-bold text-center">Caducidad</th>
                <th className="p-5 font-bold text-center">Stock Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventarioGlobal.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-5">
                    {item.estadoAlerta === "critico" && (
                      <span className="flex w-max items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle size={14}/> Caducado
                      </span>
                    )}
                    {item.estadoAlerta === "precaucion" && (
                      <span className="flex w-max items-center gap-1.5 text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <CalendarClock size={14}/> Por Vencer
                      </span>
                    )}
                    {item.estadoAlerta === "ok" && (
                      <span className="flex w-max items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <CheckCircle size={14}/> Vigente
                      </span>
                    )}
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-nespresso-dark whitespace-nowrap">{item.coffiPos}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{item.coffiNombre}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-gray-700 flex items-center gap-2 whitespace-nowrap">
                      <Package size={16} className="text-nespresso-brown"/> {item.nombre}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 ml-6">{item.lote}</p>
                  </td>
                  <td className="p-5 text-center">
                    <p className={`font-bold ${item.estadoAlerta === "critico" ? "text-red-500" : "text-gray-700"}`}>
                      {item.caducidad}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {item.diasRestantes > 0 ? `En ${item.diasRestantes} días` : `Hace ${Math.abs(item.diasRestantes)} días`}
                    </p>
                  </td>
                  <td className="p-5 text-center">
                    <span className="bg-nespresso-dark text-white px-3 py-1.5 rounded-lg font-black text-sm">
                      {item.cantidad}
                    </span>
                  </td>
                </tr>
              ))}
              {inventarioGlobal.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">No hay lotes reportados en el sistema actualmente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}