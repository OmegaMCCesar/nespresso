// src/app/(dashboard)/coffi/layout.tsx
import BottomNav from "@/components/layout/BottomNav";

export default function CoffiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Agregamos un padding inferior (pb-20) para que el contenido de la página 
    // no quede oculto detrás de la barra de navegación.
    <div className="min-h-screen bg-nespresso-cream pb-20">
      <main className="max-w-md mx-auto h-full shadow-lg bg-white min-h-screen">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}