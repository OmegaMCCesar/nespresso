// src/app/(admin)/layout.tsx
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Barra Lateral fija a la izquierda */}
      <Sidebar />
      
      {/* Contenedor principal desplazado 64 unidades a la derecha para no quedar detrás de la barra */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}