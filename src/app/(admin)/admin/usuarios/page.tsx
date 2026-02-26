// src/app/(admin)/admin/usuarios/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Loader2, Trash2, ShieldCheck, Mail, MapPin, Award } from "lucide-react";
import { db, auth } from "@/lib/firebase/config";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

type UsuarioDB = {
  uid: string;
  nombre: string;
  rol: string;
  pos?: string;
  region?: string;
  email?: string;
  supervisor?: string;   // Nombre del supervisor asignado
  supervisorId?: string; // ID del supervisor asignado
};

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("coffi");
  const [region, setRegion] = useState("");
  const [pos, setPos] = useState("");
  const [supervisorId, setSupervisorId] = useState(""); // <-- NUEVO ESTADO

  // Cargar lista de usuarios al entrar
  const fetchUsuarios = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData: UsuarioDB[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({...doc.data(), uid: doc.id } as UsuarioDB);
      });
      setUsuarios(usersData);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Filtramos la lista para obtener SOLO a los que tienen rol de supervisor
  const listaSupervisores = usuarios.filter(u => u.rol === "supervisor");

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validar que si es Coffi, a fuerza tenga un supervisor
      if (rol === "coffi" && !supervisorId) {
        alert("Debes asignar un supervisor a este promotor.");
        setIsSubmitting(false);
        return;
      }

      // App secundaria para no cerrar la sesión del admin
      const appName = "SecondaryApp";
      const secondaryApp = getApps().find(app => app.name === appName) || initializeApp(auth.app.options, appName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const nuevoUID = userCredential.user.uid;

      await secondaryAuth.signOut();

      // Buscamos el nombre del supervisor seleccionado para guardarlo en texto plano (útil para la UI)
      // Buscamos el perfil completo del supervisor seleccionado
      const supervisorAsignado = listaSupervisores.find(sup => sup.uid === supervisorId);

      // Armamos el perfil dependiendo del rol
      const nuevoPerfil: UsuarioDB = {
        uid: nuevoUID,
        nombre,
        rol,
        email,
        ...(rol === "coffi" ? { 
          pos, 
          supervisorId: supervisorAsignado?.uid || "",
          supervisor: supervisorAsignado?.nombre || "",
          region: supervisorAsignado?.region || "" // <-- ¡AQUÍ ESTÁ LA MAGIA! Hereda la región automáticamente.
        } : { 
          region // Si es gerente o supervisor, guarda la región que escribiste a mano
        })
      };

      await setDoc(doc(db, "users", nuevoUID), nuevoPerfil);

      alert("¡Cuenta creada exitosamente!");
      
      // Limpiar y cerrar
      setNombre(""); setEmail(""); setPassword(""); setRol("coffi"); setRegion(""); setPos(""); setSupervisorId("");
      setIsModalOpen(false);
      fetchUsuarios(); 
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      alert("Hubo un error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (uid: string) => {
    if (confirm("¿Estás seguro de eliminar este perfil? El usuario ya no podrá ver el panel.")) {
      try {
        await deleteDoc(doc(db, "users", uid));
        setUsuarios(usuarios.filter(u => u.uid !== uid));
      } catch (error) {
        alert("Error al eliminar");
      }
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nespresso-dark flex items-center gap-3">
            <Users className="text-nespresso-gold" size={32} />
            Gestión de Cuentas
          </h1>
          <p className="text-gray-500 mt-1">Crea y administra accesos para tu equipo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} /> Nueva Cuenta
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-5 font-bold">Usuario</th>
                <th className="p-5 font-bold">Rol</th>
                <th className="p-5 font-bold">Estructura</th>
                <th className="p-5 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((usr) => (
                <tr key={usr.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-nespresso-dark">{usr.nombre}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={12}/> {usr.email || "Sin correo"}</p>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      usr.rol === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      usr.rol === 'gerente' ? 'bg-blue-100 text-blue-700' :
                      usr.rol === 'supervisor' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {usr.rol.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      {usr.pos || usr.region || "Nacional"}
                    </p>
                    {/* MOSTRAMOS EL SUPERVISOR ASIGNADO SI ES UN COFFI */}
                    {usr.rol === "coffi" && usr.supervisor && (
                      <p className="text-[10px] font-bold text-nespresso-brown mt-1 flex items-center gap-1 uppercase">
                        <Award size={12} /> Sup: {usr.supervisor}
                      </p>
                    )}
                  </td>
                  <td className="p-5 text-center">
                    {usr.rol !== "super_admin" && (
                      <button 
                        onClick={() => handleEliminar(usr.uid)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Eliminar acceso"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">No hay usuarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-nespresso-dark p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus size={20}/> Crear Accesos</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleCrearUsuario} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Correo (Login)</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Contraseña</label>
                  <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nivel de Acceso (Rol)</label>
                <select value={rol} onChange={e => setRol(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm font-bold text-nespresso-dark">
                  <option value="coffi">Promotor (Coffi)</option>
                  <option value="supervisor">Supervisor de Zona</option>
                  <option value="gerente">Gerente Regional</option>
                </select>
              </div>

              {rol === "coffi" ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Boutique (POS)</label>
                    <input type="text" required value={pos} onChange={e => setPos(e.target.value)} placeholder="Ej. PH Durango" className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Supervisor Asignado</label>
                    <select required value={supervisorId} onChange={e => setSupervisorId(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm font-bold text-nespresso-dark">
                      <option value="">Selecciona un supervisor...</option>
                      {listaSupervisores.length === 0 && <option value="" disabled>No hay supervisores creados</option>}
                      {listaSupervisores.map(sup => (
                        <option key={sup.uid} value={sup.uid}>{sup.nombre} ({sup.region})</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Región a cargo</label>
                  <input type="text" required value={region} onChange={e => setRegion(e.target.value)} placeholder="Ej. CDMX Sur" className="w-full mt-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 outline-none text-sm" />
                </div>
              )}

              <button disabled={isSubmitting} type="submit" className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                {isSubmitting ? "Creando y autorizando..." : "Crear y Autorizar Cuenta"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}