// src/app/(admin)/admin/insumos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Coffee, Loader2, Eye, Download, Calendar as CalendarIcon, FileText, CheckCircle } from "lucide-react";

type ItemInsumo = {
  id: string;
  nombre: string;
  categoria: string;
  inicial: number;
  resurtido: number;
  final: number;
};

type ReporteInsumos = {
  id: string;
  coffiId: string;
  fechaRegistro: any;
  datos: ItemInsumo[];
  arqueoNotas: string;
  estado: string;
  // Datos cruzados del promotor
  coffiNombre?: string;
  coffiPos?: string;
};

export default function CierresInsumosPage() {
  const { userData, loading: authLoading } = useAuth();
  const [reportes, setReportes] = useState<ReporteInsumos[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado para el modal que mostrará el detalle del arqueo
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteInsumos | null>(null);

  useEffect(() => {
    if (authLoading || !userData) return;

    const fetchDatos = async () => {
      try {
        // 1. Traer usuarios para cruzar datos
        const usersSnap = await getDocs(collection(db, "users"));
        const listaUsuarios: any[] = [];
        usersSnap.forEach(doc => listaUsuarios.push({ ...doc.data(), uid: doc.id }));

        // 2. Traer todos los reportes de insumos ordenados por el más reciente
        const qInsumos = query(collection(db, "reports_insumos"), orderBy("fechaRegistro", "desc"));
        const insumosSnap = await getDocs(qInsumos);
        const todosLosReportes: ReporteInsumos[] = [];

        insumosSnap.forEach(doc => {
          todosLosReportes.push({ ...(doc.data() as ReporteInsumos), id: doc.id });
        });

        // 3. CRUZAR DATOS Y FILTRAR POR ROL
        let reportesFiltrados = todosLosReportes.map(reporte => {
          const promotor = listaUsuarios.find(u => u.uid === reporte.coffiId);
          return {
            ...reporte,
            coffiNombre: promotor?.nombre || "Usuario Desconocido",
            coffiPos: promotor?.pos || "Sin POS"
          };
        });

        if (userData.rol === "supervisor") {
          const misCoffisIds = listaUsuarios.filter(u => u.supervisorId === userData.uid).map(u => u.uid);
          reportesFiltrados = reportesFiltrados.filter(r => misCoffisIds.includes(r.coffiId));
        } else if (userData.rol === "gerente") {
          const miRegion = userData.region?.trim().toLowerCase() || "";
          const esNacional = miRegion === "nacional" || miRegion === "todas";
          const miRegionCoffisIds = listaUsuarios.filter(u => 
            esNacional || u.region?.trim().toLowerCase() === miRegion
          ).map(u => u.uid);
          
          reportesFiltrados = reportesFiltrados.filter(r => miRegionCoffisIds.includes(r.coffiId));
        }

        setReportes(reportesFiltrados);
      } catch (error) {
        console.error("Error al cargar reportes de insumos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [userData, authLoading]);

  // EXPORTAR A EXCEL (Aplanando los datos para que cada insumo sea una fila)
  const exportarAExcel = () => {
    if (reportes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const cabeceras = ["Fecha Reporte", "Promotor", "Boutique (POS)", "Categoría", "Insumo", "Stock Inicial", "Resurtido", "Stock Final", "Consumo Neto", "Notas de Arqueo"];
    
    const filas: string[] = [];
    
    reportes.forEach(reporte => {
      const fecha = reporte.fechaRegistro?.toDate ? reporte.fechaRegistro.toDate().toLocaleString('es-MX') : "Sin fecha";
      const notasLimpias = reporte.arqueoNotas ? reporte.arqueoNotas.replace(/(\r\n|\n|\r)/gm, " ") : "Ninguna";

      reporte.datos.forEach(insumo => {
        const consumoNeto = (insumo.inicial + insumo.resurtido) - insumo.final;
        filas.push(`"${fecha}","${reporte.coffiNombre}","${reporte.coffiPos}","${insumo.categoria}","${insumo.nombre}","${insumo.inicial}","${insumo.resurtido}","${insumo.final}","${consumoNeto}","${notasLimpias}"`);
      });
    });

    const contenidoCSV = "sep=,\n" + [cabeceras.join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Insumos_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
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
            <Coffee className="text-nespresso-brown" size={32} />
            Cierres de Insumos
          </h1>
          <p className="text-gray-500 mt-1">Audita el consumo diario de desechables, leche y complementos de las barras.</p>
        </header>

        {(userData?.rol === "super_admin" || userData?.rol === "supervisor") && (
          <button 
            onClick={exportarAExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={18} /> Exportar Detalle (.csv)
          </button>
        )}
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-nespresso-brown">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Cierres Registrados</p>
          <p className="text-3xl font-black text-nespresso-dark mt-1">{reportes.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon size={16} className="text-blue-500"/> Últimos 7 Días
          </p>
          <p className="text-3xl font-black text-blue-600 mt-1">
            {reportes.filter(r => {
              if (!r.fechaRegistro?.toDate) return false;
              const hace7Dias = new Date(); hace7Dias.setDate(hace7Dias.getDate() - 7);
              return r.fechaRegistro.toDate() >= hace7Dias;
            }).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-orange-500"/> Con Observaciones
          </p>
          <p className="text-3xl font-black text-orange-600 mt-1">
            {reportes.filter(r => r.arqueoNotas && r.arqueoNotas.trim().length > 0).length}
          </p>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REPORTES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-5 font-bold">Fecha / Hora</th>
                <th className="p-5 font-bold">Promotor (POS)</th>
                <th className="p-5 font-bold">Items Auditados</th>
                <th className="p-5 font-bold">Notas de Arqueo</th>
                <th className="p-5 font-bold text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportes.map((reporte) => {
                const fechaReal = reporte.fechaRegistro?.toDate ? reporte.fechaRegistro.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Sin fecha';
                const tieneNotas = reporte.arqueoNotas && reporte.arqueoNotas.trim().length > 0;

                return (
                  <tr key={reporte.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 text-sm font-bold text-nespresso-dark whitespace-nowrap">{fechaReal}</td>
                    <td className="p-5">
                      <p className="font-bold text-nespresso-dark whitespace-nowrap">{reporte.coffiNombre}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{reporte.coffiPos}</p>
                    </td>
                    <td className="p-5">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                        {reporte.datos.length} Insumos
                      </span>
                    </td>
                    <td className="p-5">
                      {tieneNotas ? (
                        <p className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded-lg max-w-xs truncate border border-orange-100">
                          {reporte.arqueoNotas}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin observaciones</span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => setReporteSeleccionado(reporte)}
                        className="text-nespresso-brown hover:text-white bg-orange-50 hover:bg-nespresso-brown p-2 rounded-lg transition-colors inline-flex border border-transparent hover:border-nespresso-brown shadow-sm"
                        title="Ver Desglose Completo"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {reportes.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">No hay cierres de insumos reportados aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DEL DESGLOSE DEL REPORTE */}
      {reporteSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setReporteSeleccionado(null)}>
          <div className="relative max-w-4xl w-full bg-gray-50 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            <div className="bg-nespresso-dark p-6 flex justify-between items-start text-white shrink-0">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl mb-1"><CheckCircle size={20} className="text-nespresso-gold" /> Desglose de Cierre</h3>
                <p className="text-xs text-gray-300">
                  {reporteSeleccionado.coffiNombre} - {reporteSeleccionado.coffiPos} | {reporteSeleccionado.fechaRegistro?.toDate().toLocaleString('es-MX')}
                </p>
              </div>
              <button onClick={() => setReporteSeleccionado(null)} className="text-gray-400 hover:text-white text-3xl font-light leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto sleek-scrollbar">
              {reporteSeleccionado.arqueoNotas && (
                <div className="bg-orange-100 border border-orange-200 p-4 rounded-xl mb-6">
                  <p className="text-xs font-black text-orange-800 uppercase tracking-wider mb-1">Notas del Promotor</p>
                  <p className="text-sm text-orange-900 leading-relaxed">{reporteSeleccionado.arqueoNotas}</p>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Insumo</th>
                      <th className="p-3 text-center">Inicial</th>
                      <th className="p-3 text-center text-blue-600">Resurtido</th>
                      <th className="p-3 text-center">Final</th>
                      <th className="p-3 text-center text-nespresso-brown">Consumo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reporteSeleccionado.datos.map((insumo, idx) => {
                      const consumoNeto = (insumo.inicial + insumo.resurtido) - insumo.final;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 text-sm">
                          <td className="p-3 text-gray-500 text-xs font-bold uppercase">{insumo.categoria}</td>
                          <td className="p-3 font-medium text-nespresso-dark">{insumo.nombre}</td>
                          <td className="p-3 text-center text-gray-600">{insumo.inicial}</td>
                          <td className="p-3 text-center font-bold text-blue-600 bg-blue-50/30">{insumo.resurtido}</td>
                          <td className="p-3 text-center font-black text-nespresso-dark bg-gray-50">{insumo.final}</td>
                          <td className="p-3 text-center font-black text-nespresso-brown bg-orange-50/50">{consumoNeto}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}