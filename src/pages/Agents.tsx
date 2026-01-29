import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AgentDetailModal } from "@/components/agents/AgentDetailModal";
import { cn } from "@/lib/utils";
import {
  Bot,
  MessageSquareText,
  Share2,
  MessagesSquare,
  CalendarDays,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Pause,
  RefreshCw,
  History,
  AlertCircle,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "error";
  enabled: boolean;
  icon: React.ElementType;
  iconColorClass: string;
  metrics: {
    tasksToday: number;
    successRate: number;
    avgResponseTime: string;
  };
}

interface ActivityEntry {
  id: string;
  agentName: string;
  action: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

const initialAgents: Agent[] = [
  {
    id: "review-reply",
    name: "Review Reply Agent",
    description: "Auto-generate personalized review responses",
    status: "active",
    enabled: true,
    icon: MessageSquareText,
    iconColorClass: "bg-warning/10 text-warning",
    metrics: {
      tasksToday: 24,
      successRate: 98,
      avgResponseTime: "2.3s",
    },
  },
  {
    id: "social-posting",
    name: "Social Posting Agent",
    description: "Generate and schedule social media posts",
    status: "active",
    enabled: true,
    icon: Share2,
    iconColorClass: "bg-info/10 text-info",
    metrics: {
      tasksToday: 12,
      successRate: 100,
      avgResponseTime: "4.1s",
    },
  },
  {
    id: "messaging",
    name: "Messaging Agent",
    description: "Handle guest inquiries automatically",
    status: "active",
    enabled: true,
    icon: MessagesSquare,
    iconColorClass: "bg-success/10 text-success",
    metrics: {
      tasksToday: 47,
      successRate: 95,
      avgResponseTime: "1.8s",
    },
  },
  {
    id: "campaign",
    name: "Campaign Agent",
    description: "Create and manage seasonal campaigns",
    status: "active",
    enabled: true,
    icon: CalendarDays,
    iconColorClass: "bg-accent/10 text-accent",
    metrics: {
      tasksToday: 8,
      successRate: 100,
      avgResponseTime: "5.2s",
    },
  },
];

const activityLog: ActivityEntry[] = [
  {
    id: "1",
    agentName: "Messaging Agent",
    action: "Responded to guest inquiry about check-in time",
    timestamp: "2 min ago",
    status: "completed",
  },
  {
    id: "2",
    agentName: "Review Reply Agent",
    action: "Generated response for 5-star Booking.com review",
    timestamp: "5 min ago",
    status: "completed",
  },
  {
    id: "3",
    agentName: "Social Posting Agent",
    action: "Scheduled Instagram post for tomorrow 9 AM",
    timestamp: "12 min ago",
    status: "completed",
  },
  {
    id: "4",
    agentName: "Campaign Agent",
    action: "Creating Valentine's Day email campaign",
    timestamp: "15 min ago",
    status: "pending",
  },
  {
    id: "5",
    agentName: "Messaging Agent",
    action: "Handled room upgrade request",
    timestamp: "18 min ago",
    status: "completed",
  },
  {
    id: "6",
    agentName: "Review Reply Agent",
    action: "Flagged negative review for manual review",
    timestamp: "25 min ago",
    status: "completed",
  },
];

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const openAgentDetail = (agent: Agent) => {
    setSelectedAgent(agent);
    setDetailModalOpen(true);
  };

  const toggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              enabled: !agent.enabled,
              status: !agent.enabled ? "active" : "paused",
            }
          : agent
      )
    );
  };

  const activeAgentsCount = agents.filter((a) => a.enabled).length;
  const totalTasksToday = agents.reduce((sum, a) => sum + a.metrics.tasksToday, 0);
  const avgSuccessRate = Math.round(
    agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length
  );

  const getStatusBadge = (status: ActivityEntry["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
            Failed
          </Badge>
        );
    }
  };

  const getAgentStatusIndicator = (status: Agent["status"]) => {
    switch (status) {
      case "active":
        return <span className="w-2 h-2 rounded-full bg-success animate-pulse" />;
      case "paused":
        return <span className="w-2 h-2 rounded-full bg-muted-foreground" />;
      case "error":
        return <span className="w-2 h-2 rounded-full bg-destructive" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="AI Agents" subtitle="Monitor and manage your autonomous AI agents" />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Agents"
            value={`${activeAgentsCount}/4`}
            icon={<Bot className="w-5 h-5" />}
            iconColor="bg-accent/10 text-accent"
            delay={0}
          />
          <StatCard
            title="Tasks Today"
            value={totalTasksToday}
            change={12}
            icon={<CheckCircle2 className="w-5 h-5" />}
            iconColor="bg-success/10 text-success"
            delay={0.1}
          />
          <StatCard
            title="Success Rate"
            value={`${avgSuccessRate}%`}
            change={2}
            icon={<TrendingUp className="w-5 h-5" />}
            iconColor="bg-info/10 text-info"
            delay={0.2}
          />
          <StatCard
            title="Time Saved"
            value="12.5 hrs"
            icon={<Clock className="w-5 h-5" />}
            iconColor="bg-warning/10 text-warning"
            delay={0.3}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap gap-3"
        >
          <Button variant="outline" className="gap-2">
            <Pause className="w-4 h-4" />
            Pause All Agents
          </Button>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Run Manual Sync
          </Button>
          <Button variant="ghost" className="gap-2">
            <History className="w-4 h-4" />
            View Activity History
          </Button>
        </motion.div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          agent.iconColorClass
                        )}
                      >
                        <agent.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          {getAgentStatusIndicator(agent.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={agent.enabled}
                      onCheckedChange={() => toggleAgent(agent.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Tasks Today</p>
                      <p className="text-lg font-semibold">{agent.metrics.tasksToday}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-semibold">{agent.metrics.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Response</p>
                      <p className="text-lg font-semibold">{agent.metrics.avgResponseTime}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 gap-2"
                    onClick={() => openAgentDetail(agent)}
                  >
                    <Zap className="w-4 h-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {entry.agentName}
                        </span>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.action}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                      {entry.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Detail Modal */}
        <AgentDetailModal
          agent={selectedAgent}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          onToggleAgent={toggleAgent}
        />
      </div>
    </div>
  );
}
