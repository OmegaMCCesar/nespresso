// src/app/(admin)/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Users, Target, TrendingUp, Award, Filter, Coffee, Edit3, CheckCircle } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, doc, updateDoc } from "firebase/firestore";

type KPIStats = { totalVentas: number; coffisActivos: number; ventasPendientes: number; promedioPorCoffi: number; };
type EquipoRendimiento = { uid: string; nombre: string; pos: string; ventas: number; meta: number; };

export default function AdminDashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<KPIStats>({ totalVentas: 0, coffisActivos: 0, ventasPendientes: 0, promedioPorCoffi: 0 });
  const [equipo, setEquipo] = useState<EquipoRendimiento[]>([]);
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [filtroSupervisor, setFiltroSupervisor] = useState<string>("todos");
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Estados para el Modal de Fijar Meta
  const [modalMeta, setModalMeta] = useState<{ isOpen: boolean, uid: string, nombre: string, metaActual: number } | null>(null);
  const [nuevaMetaInput, setNuevaMetaInput] = useState<number>(0);
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userData?.rol === "coffi")) router.push("/login");
  }, [user, userData, loading, router]);

  const fetchDashboardData = async () => {
    if (!userData) return;
    setCargandoDatos(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const todosLosUsuarios: any[] = [];
      usersSnap.forEach(doc => todosLosUsuarios.push({ ...doc.data(), uid: doc.id }));

      const ventasSnap = await getDocs(collection(db, "sales"));
      const todasLasVentas: any[] = [];
      ventasSnap.forEach(doc => todasLasVentas.push({ ...doc.data(), id: doc.id }));

      let misCoffis: any[] = [];
      let misSupervisores: any[] = [];
      const miRegionNormalizada = userData.region?.trim().toLowerCase() || "";
      const esNacional = miRegionNormalizada === "nacional" || miRegionNormalizada === "todas";

      if (userData.rol === "supervisor") {
        misCoffis = todosLosUsuarios.filter(u => u.rol === "coffi" && u.supervisorId === userData.uid);
      } else if (userData.rol === "gerente") {
        misSupervisores = todosLosUsuarios.filter(u => u.rol === "supervisor" && (esNacional || u.region?.trim().toLowerCase() === miRegionNormalizada));
        setSupervisores(misSupervisores);
        misCoffis = todosLosUsuarios.filter(u => u.rol === "coffi" && (esNacional || u.region?.trim().toLowerCase() === miRegionNormalizada));
      } else if (userData.rol === "super_admin") {
        misSupervisores = todosLosUsuarios.filter(u => u.rol === "supervisor");
        setSupervisores(misSupervisores);
        misCoffis = todosLosUsuarios.filter(u => u.rol === "coffi");
      }

      if (filtroSupervisor !== "todos") {
        misCoffis = misCoffis.filter(c => c.supervisorId === filtroSupervisor);
      }

      const misCoffisIds = misCoffis.map(c => c.uid);
      const misVentas = todasLasVentas.filter(v => misCoffisIds.includes(v.coffiId));

      setStats({
        totalVentas: misVentas.length,
        coffisActivos: misCoffisIds.length,
        ventasPendientes: misVentas.filter(v => v.estado === "pendiente_validacion").length,
        promedioPorCoffi: parseFloat((misCoffisIds.length > 0 ? (misVentas.length / misCoffisIds.length).toFixed(1) : "0"))
      });

      const ranking = misCoffis.map(coffi => {
        const ventasDelCoffi = misVentas.filter(v => v.coffiId === coffi.uid).length;
        return { 
          uid: coffi.uid, 
          nombre: coffi.nombre, 
          pos: coffi.pos || "N/A", 
          ventas: ventasDelCoffi,
          meta: coffi.metaVentas || 10 // Leemos la meta de la BD, si no, 10
        };
      });

      ranking.sort((a, b) => b.ventas - a.ventas);
      setEquipo(ranking);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCargandoDatos(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [userData, filtroSupervisor]);

  // Función para guardar la nueva meta en Firebase
  const guardarNuevaMeta = async () => {
    if (!modalMeta) return;
    setGuardandoMeta(true);
    try {
      await updateDoc(doc(db, "users", modalMeta.uid), { metaVentas: nuevaMetaInput });
      // Actualizamos UI sin recargar
      setEquipo(prev => prev.map(c => c.uid === modalMeta.uid ? { ...c, meta: nuevaMetaInput } : c));
      setModalMeta(null);
    } catch (error) {
      alert("Error al guardar la meta.");
    } finally {
      setGuardandoMeta(false);
    }
  };

  if (loading || !userData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <header>
          <h1 className="text-3xl font-bold text-nespresso-dark">Resumen Operativo</h1>
          <p className="text-gray-500 mt-1">Bienvenido, {userData.nombre}. {userData.rol === "super_admin" ? "Vista Global" : `Región: ${userData.region || "Asignada"}`}</p>
        </header>

        {(userData.rol === "gerente" || userData.rol === "super_admin") && (
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
            <Filter size={16} className="text-gray-400" />
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Filtrar Equipo</label>
              <select value={filtroSupervisor} onChange={e => setFiltroSupervisor(e.target.value)} className="bg-transparent text-sm font-bold text-nespresso-dark outline-none cursor-pointer">
                <option value="todos">Todos los Supervisores</option>
                {supervisores.map(sup => <option key={sup.uid} value={sup.uid}>{sup.nombre} ({sup.region || "Gral"})</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {cargandoDatos ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-b-blue-500 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Users size={24} /></div>
              <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fuerza de Ventas</p><p className="text-2xl font-black text-nespresso-dark">{stats.coffisActivos}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-b-green-500 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0"><Target size={24} /></div>
              <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ventas Totales</p><p className="text-2xl font-black text-nespresso-dark">{stats.totalVentas}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-b-yellow-400 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center shrink-0"><Coffee size={24} /></div>
              <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Por Validar</p><p className="text-2xl font-black text-nespresso-dark">{stats.ventasPendientes}</p></div>
            </div>
            <div className="bg-nespresso-dark p-6 rounded-2xl shadow-md border-b-4 border-b-nespresso-gold flex items-center gap-4">
              <div className="w-12 h-12 bg-nespresso-gold/20 text-nespresso-gold rounded-full flex items-center justify-center shrink-0"><TrendingUp size={24} /></div>
              <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Promedio Venta</p><p className="text-2xl font-black text-white">{stats.promedioPorCoffi}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-nespresso-dark flex items-center gap-2 mb-6"><Award className="text-nespresso-gold" /> Rendimiento y Metas del Equipo</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-4 font-bold">Promotor</th>
                    <th className="p-4 font-bold text-center">Progreso</th>
                    <th className="p-4 font-bold text-center">Ventas / Meta</th>
                    <th className="p-4 font-bold text-center">Ajustar Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {equipo.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No hay promotores en esta selección.</td></tr>
                  ) : (
                    equipo.map((coffi) => {
                      const porcentaje = Math.min(Math.round((coffi.ventas / (coffi.meta || 1)) * 100), 100);
                      return (
                        <tr key={coffi.uid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-nespresso-dark">{coffi.nombre}</p>
                            <p className="text-xs text-gray-400">{coffi.pos}</p>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${porcentaje >= 100 ? "bg-green-500" : "bg-nespresso-gold"}`} style={{ width: `${porcentaje}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-gray-500">{porcentaje}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <p className="font-black text-lg text-nespresso-brown">{coffi.ventas} <span className="text-sm font-medium text-gray-400">/ {coffi.meta}</span></p>
                          </td>
                          <td className="p-4 text-center">
                            {(userData.rol === "supervisor" || userData.rol === "super_admin") && (
                              <button 
                                onClick={() => {
                                  setNuevaMetaInput(coffi.meta);
                                  setModalMeta({ isOpen: true, uid: coffi.uid, nombre: coffi.nombre, metaActual: coffi.meta });
                                }}
                                className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors inline-flex"
                                title="Editar Cuota Mensual"
                              >
                                <Edit3 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL FIJAR META */}
      {modalMeta?.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setModalMeta(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-nespresso-dark mb-1">Ajustar Cuota</h3>
            <p className="text-sm text-gray-500 mb-6">Fijar nueva meta para <strong>{modalMeta.nombre}</strong></p>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Meta de Máquinas</label>
              <input 
                type="number" 
                min="1" 
                value={nuevaMetaInput} 
                onChange={e => setNuevaMetaInput(Number(e.target.value))}
                className="w-full text-center text-3xl font-black text-nespresso-brown bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-nespresso-gold"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalMeta(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button 
                onClick={guardarNuevaMeta} 
                disabled={guardandoMeta || nuevaMetaInput <= 0}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {guardandoMeta ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}