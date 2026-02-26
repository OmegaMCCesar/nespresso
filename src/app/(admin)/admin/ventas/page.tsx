// src/app/(admin)/admin/ventas/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { BarChart3, Loader2, CheckCircle, XCircle, Eye, Image as ImageIcon, Download } from "lucide-react";

type VentaInfo = {
  id: string;
  coffiId: string;
  modeloId: string;
  cantidad: number;
  ticketUrl: string;
  estado: "pendiente_validacion" | "aprobada" | "rechazada";
  fecha: any; 
  coffiNombre?: string;
  coffiPos?: string;
};

export default function VentasEquipoPage() {
  const { userData, loading: authLoading } = useAuth();
  const [ventas, setVentas] = useState<VentaInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !userData) return;

    const fetchDatos = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const listaUsuarios: any[] = [];
        usersSnap.forEach(doc => listaUsuarios.push({ ...doc.data(), uid: doc.id }));

        const qVentas = query(collection(db, "sales"), orderBy("fecha", "desc"));
        const ventasSnap = await getDocs(qVentas);
        const todasLasVentas: VentaInfo[] = [];

        ventasSnap.forEach(doc => {
          todasLasVentas.push({ ...(doc.data() as VentaInfo), id: doc.id });
        });

        let ventasFiltradas = todasLasVentas.map(venta => {
          const promotor = listaUsuarios.find(u => u.uid === venta.coffiId);
          return {
            ...venta,
            coffiNombre: promotor?.nombre || "Usuario Desconocido",
            coffiPos: promotor?.pos || "Sin POS"
          };
        });

        if (userData.rol === "supervisor") {
          const misCoffisIds = listaUsuarios.filter(u => u.supervisorId === userData.uid).map(u => u.uid);
          ventasFiltradas = ventasFiltradas.filter(v => misCoffisIds.includes(v.coffiId));
        } else if (userData.rol === "gerente") {
          const miRegionNormalizada = userData.region?.trim().toLowerCase() || "";
          const esNacional = miRegionNormalizada === "nacional" || miRegionNormalizada === "todas";
          const miRegionCoffisIds = listaUsuarios.filter(u => 
            esNacional || u.region?.trim().toLowerCase() === miRegionNormalizada
          ).map(u => u.uid);
          
          ventasFiltradas = ventasFiltradas.filter(v => miRegionCoffisIds.includes(v.coffiId));
        }

        setVentas(ventasFiltradas);
      } catch (error) {
        console.error("Error al cargar ventas:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [userData, authLoading]);

  const cambiarEstadoTicket = async (ventaId: string, nuevoEstado: "aprobada" | "rechazada") => {
    try {
      const docRef = doc(db, "sales", ventaId);
      await updateDoc(docRef, { estado: nuevoEstado });
      setVentas(prev => prev.map(v => v.id === ventaId ? { ...v, estado: nuevoEstado } : v));
    } catch (error) {
      alert("Error al actualizar el estado del ticket.");
    }
  };

 // FUNCIÓN MÁGICA PARA EXPORTAR A EXCEL (CON IMÁGENES Y LINKS LIMPIOS)
  const exportarAExcel = () => {
    if (ventas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    // 1. Agregamos dos columnas nuevas para la imagen y el link limpio
    const cabeceras = ["Fecha", "Promotor", "Boutique (POS)", "Maquina Vendida", "Estado Validacion", "Foto del Ticket", "Link Directo"];
    
    // 2. Transformamos los datos
    const filas = ventas.map(v => {
      const fecha = v.fecha?.toDate ? v.fecha.toDate().toLocaleString('es-MX') : "Sin fecha";
      
      // TRUCO 1: Le decimos a Excel que renderice la imagen en la celda (Solo funciona en Office 365 / versiones recientes)
      // Excel requiere que las comillas internas vayan dobles (""url"") en un CSV
      const formulaImagen = `"=IMAGE(""${v.ticketUrl}"")"`;
      
      // TRUCO 2: Hacemos un link azul limpio y clickeable por si su Excel es viejito y no soporta =IMAGE()
      const formulaLink = `"=HYPERLINK(""${v.ticketUrl}"", ""Abrir Foto"")"`;

      return `"${fecha}","${v.coffiNombre}","${v.coffiPos}","${v.modeloId}","${v.estado}",${formulaImagen},${formulaLink}`;
    });

    // 3. El truco de separación regional para Excel
    const contenidoCSV = "sep=,\n" + [cabeceras.join(","), ...filas].join("\n");

    // 4. Descarga del archivo
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reporte_Ventas_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (authLoading || cargando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;
  }

  return (
    <div className="animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <header>
          <h1 className="text-3xl font-bold text-nespresso-dark flex items-center gap-3">
            <BarChart3 className="text-nespresso-gold" size={32} />
            Ventas de Equipo
          </h1>
          <p className="text-gray-500 mt-1">Valida y monitorea los tickets subidos por los promotores.</p>
        </header>

        {/* BOTÓN DE EXPORTAR (Protegido por RBAC: Solo Super Admin y Supervisor) */}
        {(userData?.rol === "super_admin" || userData?.rol === "supervisor") && (
          <button 
            onClick={exportarAExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={18} /> Exportar Reporte (.csv)
          </button>
        )}
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-nespresso-brown">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Registros</p>
          <p className="text-3xl font-black text-nespresso-dark mt-1">{ventas.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-400">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pendientes Validar</p>
          <p className="text-3xl font-black text-nespresso-dark mt-1">
            {ventas.filter(v => v.estado === "pendiente_validacion").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tickets Aprobados</p>
          <p className="text-3xl font-black text-nespresso-dark mt-1">
            {ventas.filter(v => v.estado === "aprobada").length}
          </p>
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-5 font-bold">Fecha</th>
                <th className="p-5 font-bold">Promotor (POS)</th>
                <th className="p-5 font-bold">Máquina</th>
                <th className="p-5 font-bold text-center">Ticket</th>
                <th className="p-5 font-bold">Estado</th>
                <th className="p-5 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ventas.map((venta) => {
                const fechaReal = venta.fecha?.toDate ? venta.fecha.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' }) : 'Sin fecha';
                
                return (
                  <tr key={venta.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 text-sm text-gray-600 font-medium whitespace-nowrap">{fechaReal}</td>
                    <td className="p-5">
                      <p className="font-bold text-nespresso-dark whitespace-nowrap">{venta.coffiNombre}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{venta.coffiPos}</p>
                    </td>
                    <td className="p-5">
                      <span className="bg-gray-100 text-nespresso-dark px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                        {venta.modeloId}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => setTicketSeleccionado(venta.ticketUrl)}
                        className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors inline-flex"
                        title="Ver Foto del Ticket"
                      >
                        <ImageIcon size={18} />
                      </button>
                    </td>
                    <td className="p-5">
                      {venta.estado === "pendiente_validacion" && <span className="text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Pendiente</span>}
                      {venta.estado === "aprobada" && <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Aprobada</span>}
                      {venta.estado === "rechazada" && <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Rechazada</span>}
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => cambiarEstadoTicket(venta.id, "aprobada")}
                          disabled={venta.estado === "aprobada"}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg disabled:opacity-30 transition-colors"
                          title="Aprobar Venta"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={() => cambiarEstadoTicket(venta.id, "rechazada")}
                          disabled={venta.estado === "rechazada"}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors"
                          title="Rechazar Venta"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ventas.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">No hay ventas registradas en tu estructura.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL VISOR DE TICKETS */}
      {ticketSeleccionado && (
        <div className="fixed inset-0 bg-black/80 z-70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setTicketSeleccionado(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-nespresso-dark p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><Eye size={18} /> Evidencia de Venta</h3>
              <button onClick={() => setTicketSeleccionado(null)} className="text-gray-400 hover:text-white text-xl font-bold">&times;</button>
            </div>
            <div className="p-4 flex justify-center bg-gray-100 min-h-[50vh]">
              <img 
                src={ticketSeleccionado} 
                alt="Ticket de Venta" 
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}