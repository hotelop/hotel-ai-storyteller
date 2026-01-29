import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Gift,
  Heart,
  Sun,
  Sparkles,
  Mail,
  MessageSquare,
  Share2,
  ChevronRight,
  Play,
  Pause,
  BarChart3,
  Users,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const campaigns = [
  {
    id: 1,
    name: "Valentine's Day Special",
    icon: Heart,
    iconColor: "bg-pink-500/10 text-pink-500",
    status: "active",
    startDate: "Feb 1",
    endDate: "Feb 14",
    channels: ["email", "social", "sms"],
    reach: "12.4K",
    conversions: 89,
    revenue: "$24,500",
    progress: 45,
  },
  {
    id: 2,
    name: "Summer Getaway",
    icon: Sun,
    iconColor: "bg-amber-500/10 text-amber-500",
    status: "scheduled",
    startDate: "Jun 1",
    endDate: "Aug 31",
    channels: ["email", "social"],
    reach: "-",
    conversions: 0,
    revenue: "$0",
    progress: 0,
  },
  {
    id: 3,
    name: "Holiday Season",
    icon: Gift,
    iconColor: "bg-red-500/10 text-red-500",
    status: "completed",
    startDate: "Dec 15",
    endDate: "Jan 5",
    channels: ["email", "social", "sms"],
    reach: "45.2K",
    conversions: 312,
    revenue: "$89,400",
    progress: 100,
  },
];

const templates = [
  { id: 1, name: "Valentine's Romance", category: "Seasonal", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=150&fit=crop" },
  { id: 2, name: "Summer Escape", category: "Seasonal", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop" },
  { id: 3, name: "Business Package", category: "Offer", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=150&fit=crop" },
  { id: 4, name: "Weekend Deal", category: "Promo", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200&h=150&fit=crop" },
];

export default function Campaigns() {
  return (
    <div className="min-h-screen">
      <Header title="Campaigns" subtitle="Plan and execute seasonal marketing campaigns" />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Active Campaigns</p>
            <p className="text-2xl font-semibold">3</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Total Reach</p>
            <p className="text-2xl font-semibold">57.6K</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Conversions</p>
            <p className="text-2xl font-semibold text-success">401</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Revenue Generated</p>
            <p className="text-2xl font-semibold text-accent">$113.9K</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaigns List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Campaigns</h3>
              <Button className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Sparkles className="w-4 h-4" />
                Create Campaign
              </Button>
            </div>

            {campaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-card rounded-xl border border-border p-5 hover:border-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", campaign.iconColor)}>
                    <campaign.icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <Badge
                        className={cn(
                          "text-xs capitalize",
                          campaign.status === "active" && "bg-success text-success-foreground",
                          campaign.status === "scheduled" && "bg-info text-info-foreground",
                          campaign.status === "completed" && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{campaign.startDate} - {campaign.endDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {campaign.channels.map((ch) => (
                          <span key={ch} className="text-xs bg-secondary px-2 py-0.5 rounded capitalize">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>

                    {campaign.status !== "scheduled" && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{campaign.progress}%</span>
                        </div>
                        <Progress value={campaign.progress} className="h-1.5" />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Reach</p>
                          <p className="text-sm font-medium">{campaign.reach}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                          <p className="text-sm font-medium">{campaign.conversions}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-sm font-medium text-accent">{campaign.revenue}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaign.status === "active" && (
                      <Button variant="outline" size="icon">
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    {campaign.status === "scheduled" && (
                      <Button variant="outline" size="icon">
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Templates */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h3 className="font-semibold mb-4">Campaign Templates</h3>
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <img
                    src={template.image}
                    alt={template.name}
                    className="w-16 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.category}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Use
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4">
              Browse All Templates
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
