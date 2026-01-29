import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  iconColor = "bg-accent/10 text-accent",
  delay = 0,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="w-3 h-3" />;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    return <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!change) return "text-muted-foreground";
    if (change > 0) return "text-success";
    return "text-destructive";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="stat-card group transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor)}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {changeLabel && change !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
      )}
    </motion.div>
  );
}
