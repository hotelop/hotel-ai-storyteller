import { ReactNode } from "react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { Building2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <MobileSidebar />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-semibold text-foreground">Hotel Ops</span>
          </div>
        </header>
        
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
