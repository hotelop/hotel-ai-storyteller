import { motion } from "framer-motion";
import { MessageSquare, Share2, Star, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "review",
    icon: Star,
    iconBg: "bg-warning/10 text-warning",
    title: "New 5-star review on TripAdvisor",
    description: "AI drafted a response for your approval",
    time: "2 min ago",
  },
  {
    id: 2,
    type: "social",
    icon: Share2,
    iconBg: "bg-info/10 text-info",
    title: "Instagram post published",
    description: "Summer promotion reached 2.4k impressions",
    time: "15 min ago",
  },
  {
    id: 3,
    type: "message",
    icon: MessageSquare,
    iconBg: "bg-success/10 text-success",
    title: "Booking inquiry responded",
    description: "AI answered availability question on WhatsApp",
    time: "32 min ago",
  },
  {
    id: 4,
    type: "campaign",
    icon: Mail,
    iconBg: "bg-accent/10 text-accent",
    title: "Valentine's campaign scheduled",
    description: "Email campaign set for Feb 1st",
    time: "1 hr ago",
  },
  {
    id: 5,
    type: "review",
    icon: Star,
    iconBg: "bg-destructive/10 text-destructive",
    title: "3-star review needs attention",
    description: "Guest mentioned AC issues - prioritized",
    time: "2 hr ago",
  },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-accent hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            className="flex items-start gap-3 group cursor-pointer"
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                activity.iconBg
              )}
            >
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{activity.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
