// src/components/layout/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, ClipboardList, User, Coffee } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", href: "/coffi", icon: Home },
    { name: "Venta", href: "/coffi/ventas", icon: Camera },
    { name: "Winset", href: "/coffi/inventario", icon: ClipboardList },
    { name: "Insumos", href: "/coffi/insumos", icon: Coffee },
    { name: "Perfil", href: "/coffi/perfil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-nespresso-dark text-nespresso-cream border-t border-nespresso-brown z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-nespresso-gold" : "text-gray-400 hover:text-nespresso-cream"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}