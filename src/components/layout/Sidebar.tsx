import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Share2,
  MessageSquareText,
  MessagesSquare,
  CalendarDays,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Share2, label: "Social Posting", path: "/social" },
  { icon: MessageSquareText, label: "Reviews", path: "/reviews" },
  { icon: MessagesSquare, label: "Messaging", path: "/messaging" },
  { icon: CalendarDays, label: "Campaigns", path: "/campaigns" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onNavClick?: () => void;
}

function SidebarContent({ collapsed = false, onNavClick }: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <Building2 className="w-5 h-5 text-accent-foreground" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <h1 className="font-semibold text-sidebar-foreground text-base">Hotel Ops</h1>
              <p className="text-xs text-sidebar-foreground/60">AI Agent Suite</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-6 bg-sidebar-primary rounded-r-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* AI Agent Status */}
      <div className="px-3 pb-4">
        <div
          className={cn(
            "rounded-lg bg-sidebar-accent/50 border border-sidebar-border p-3",
            collapsed && "p-2"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-medium text-sidebar-foreground">AI Agents Active</p>
                  <p className="text-xs text-sidebar-foreground/60">4 agents running</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="sidebar-gradient hidden lg:flex flex-col h-screen sticky top-0 border-r border-sidebar-border"
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </motion.aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px] sidebar-gradient border-sidebar-border">
        <div className="flex flex-col h-full">
          <SidebarContent onNavClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
