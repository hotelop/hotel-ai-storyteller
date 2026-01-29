import { motion } from "framer-motion";
import { Instagram, Facebook, Linkedin, Twitter, Plus, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const scheduledPosts = [
  {
    id: 1,
    platform: "instagram",
    icon: Instagram,
    title: "Summer Pool Vibes 🌴",
    scheduledFor: "Today, 2:00 PM",
    status: "scheduled",
    preview: "Dive into relaxation this summer...",
    reach: "2.1k est.",
  },
  {
    id: 2,
    platform: "facebook",
    icon: Facebook,
    title: "Weekend Getaway Package",
    scheduledFor: "Tomorrow, 10:00 AM",
    status: "scheduled",
    preview: "Escape the city with our exclusive...",
    reach: "1.8k est.",
  },
  {
    id: 3,
    platform: "linkedin",
    icon: Linkedin,
    title: "Business Travel Excellence",
    scheduledFor: "Wed, 9:00 AM",
    status: "draft",
    preview: "Our business facilities include...",
    reach: "950 est.",
  },
];

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-500",
  facebook: "bg-blue-600/10 text-blue-600",
  linkedin: "bg-blue-700/10 text-blue-700",
  twitter: "bg-sky-500/10 text-sky-500",
};

export function SocialCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">Scheduled Posts</h3>
        <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4" />
          New Post
        </Button>
      </div>

      <div className="space-y-3">
        {scheduledPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
            className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border hover:border-accent/30 transition-all cursor-pointer"
          >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", platformColors[post.platform])}>
              <post.icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                <Badge
                  variant={post.status === "scheduled" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {post.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{post.preview}</p>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{post.scheduledFor}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-accent">
                <Eye className="w-3 h-3" />
                <span>{post.reach}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">
          View Full Calendar →
        </Button>
      </div>
    </motion.div>
  );
}
