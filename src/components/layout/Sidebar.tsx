// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  BarChart3, 
  AlertTriangle, 
  Coffee, 
  MessageSquare, 
  Users, 
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // DEFINICIÓN DE ACCESOS POR ROL
  const menuItems = [
    { 
      name: "Resumen Operativo", href: "/admin", icon: LayoutDashboard, 
      roles: ["super_admin", "gerente", "supervisor"] 
    },
    { 
      name: "Ventas de Equipo", href: "/admin/ventas", icon: BarChart3, 
      roles: ["super_admin", "gerente", "supervisor"] 
    },
    { 
      name: "Alertas Winset", href: "/admin/winset", icon: AlertTriangle, 
      roles: ["super_admin", "gerente", "supervisor"] 
    },
    { 
      name: "Cierres Insumos", href: "/admin/insumos", icon: Coffee, 
      roles: ["super_admin", "gerente", "supervisor"] 
    },
    { 
      // EXCLUSIVO PARA SUPERVISOR Y SUPER ADMIN (El Gerente no manda mensajes operativos)
      name: "Mensajes PUSH", href: "/admin/mensajes", icon: MessageSquare, 
      roles: ["super_admin", "supervisor"] 
    },
  ];

  // Filtramos el menú para que solo queden las opciones a las que este rol tiene permiso
  const menuPermitido = menuItems.filter(item => 
    userData?.rol && item.roles.includes(userData.rol)
  );

  return (
    <aside className="w-64 bg-nespresso-dark h-screen flex flex-col fixed left-0 top-0 border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-50">
      
      {/* 1. LOGO ELEGANTE */}
      <div className="h-24 flex flex-col items-center justify-center border-b border-white/10 relative">
        <div className="absolute inset-0 bg-linear-to-b from-black/40 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-2 relative z-10">
          <Coffee size={28} className="text-nespresso-gold" strokeWidth={1.5} />
          <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase">Nespresso</h1>
        </div>
        <p className="text-[9px] text-nespresso-gold/70 mt-1 uppercase tracking-[0.3em] relative z-10">Portal Manager</p>
      </div>

      {/* 2. NAVEGACIÓN PRINCIPAL */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto sleek-scrollbar">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Menú Principal</p>
        
        {menuPermitido.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActive 
                  ? "bg-linear-to-r from-nespresso-gold/20 to-transparent border-l-2 border-nespresso-gold text-nespresso-gold" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:translate-x-1"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-nespresso-gold" : "text-gray-500 group-hover:text-gray-300"} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}

        {/* MENÚ EXCLUSIVO PARA SUPER_ADMIN */}
        {userData?.rol === "super_admin" && (
          <>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-10 mb-4 px-2">Administración</p>
            <Link
              href="/admin/usuarios"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                pathname === "/admin/usuarios" 
                  ? "bg-linear-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500 text-blue-400" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:translate-x-1"
              }`}
            >
              <Users size={18} className={pathname === "/admin/usuarios" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"} />
              <span className="font-medium text-sm">Gestión de Cuentas</span>
            </Link>
          </>
        )}
      </nav>

      {/* 3. PERFIL Y CERRAR SESIÓN */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-nespresso-brown border border-nespresso-gold/30 flex items-center justify-center text-nespresso-gold font-bold shadow-inner">
            {userData?.nombre?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-200 truncate">{userData?.nombre || "Cargando..."}</p>
            <p className="text-[9px] text-nespresso-gold flex items-center gap-1 mt-0.5 uppercase tracking-wider truncate">
              <ShieldCheck size={12} /> {userData?.rol?.replace('_', ' ')}
            </p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs font-bold uppercase tracking-wider border border-transparent hover:border-red-400/20"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}