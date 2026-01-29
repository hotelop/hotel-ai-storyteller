import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Settings,
  History,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

interface AgentConfig {
  autoApprove: boolean;
  maxTasksPerHour: number;
  priorityLevel: "low" | "medium" | "high";
  notificationsEnabled: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

interface HistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  details?: string;
}

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

interface AgentDetailModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleAgent: (agentId: string) => void;
}

// Mock history data per agent
const agentHistory: Record<string, HistoryEntry[]> = {
  "review-reply": [
    { id: "1", action: "Generated response for 5-star Booking.com review", timestamp: "5 min ago", status: "completed", details: "Response approved and posted automatically" },
    { id: "2", action: "Flagged negative review for manual review", timestamp: "25 min ago", status: "completed", details: "Review requires human attention due to complaint" },
    { id: "3", action: "Generated response for TripAdvisor review", timestamp: "1 hr ago", status: "completed" },
    { id: "4", action: "Batch processed 8 Expedia reviews", timestamp: "2 hrs ago", status: "completed", details: "All responses generated successfully" },
    { id: "5", action: "Failed to fetch Google reviews", timestamp: "3 hrs ago", status: "failed", details: "API rate limit exceeded, retrying in 1 hour" },
    { id: "6", action: "Generated personalized response for repeat guest", timestamp: "4 hrs ago", status: "completed" },
  ],
  "social-posting": [
    { id: "1", action: "Scheduled Instagram post for tomorrow 9 AM", timestamp: "12 min ago", status: "completed", details: "Photo carousel with 4 images" },
    { id: "2", action: "Generated Twitter thread about weekend specials", timestamp: "1 hr ago", status: "completed" },
    { id: "3", action: "Preparing Facebook post for Valentine's promo", timestamp: "2 hrs ago", status: "pending", details: "Awaiting image generation" },
    { id: "4", action: "Posted story to Instagram", timestamp: "3 hrs ago", status: "completed" },
    { id: "5", action: "Analyzed best posting times for this week", timestamp: "5 hrs ago", status: "completed" },
  ],
  "messaging": [
    { id: "1", action: "Responded to guest inquiry about check-in time", timestamp: "2 min ago", status: "completed", details: "Provided early check-in options" },
    { id: "2", action: "Handled room upgrade request", timestamp: "18 min ago", status: "completed", details: "Upgraded to suite, confirmed with guest" },
    { id: "3", action: "Answered FAQ about parking", timestamp: "30 min ago", status: "completed" },
    { id: "4", action: "Escalated complaint to manager", timestamp: "45 min ago", status: "completed", details: "Guest reported noise issue" },
    { id: "5", action: "Processed late checkout request", timestamp: "1 hr ago", status: "completed" },
    { id: "6", action: "Sent welcome message to new booking", timestamp: "2 hrs ago", status: "completed" },
    { id: "7", action: "Failed to process payment inquiry", timestamp: "3 hrs ago", status: "failed", details: "Payment system temporarily unavailable" },
  ],
  "campaign": [
    { id: "1", action: "Creating Valentine's Day email campaign", timestamp: "15 min ago", status: "pending", details: "Generating email copy and visuals" },
    { id: "2", action: "Analyzed Q4 campaign performance", timestamp: "1 hr ago", status: "completed", details: "ROI: 340%, CTR: 4.2%" },
    { id: "3", action: "Scheduled Spring Break promotion", timestamp: "3 hrs ago", status: "completed" },
    { id: "4", action: "A/B test completed for subject lines", timestamp: "5 hrs ago", status: "completed", details: "Version B won with 12% higher open rate" },
  ],
};

// Default config per agent
const defaultConfigs: Record<string, AgentConfig> = {
  "review-reply": {
    autoApprove: false,
    maxTasksPerHour: 20,
    priorityLevel: "high",
    notificationsEnabled: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  "social-posting": {
    autoApprove: true,
    maxTasksPerHour: 10,
    priorityLevel: "medium",
    notificationsEnabled: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  "messaging": {
    autoApprove: true,
    maxTasksPerHour: 50,
    priorityLevel: "high",
    notificationsEnabled: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  "campaign": {
    autoApprove: false,
    maxTasksPerHour: 5,
    priorityLevel: "low",
    notificationsEnabled: true,
    retryOnFailure: false,
    maxRetries: 1,
  },
};

export function AgentDetailModal({
  agent,
  open,
  onOpenChange,
  onToggleAgent,
}: AgentDetailModalProps) {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>(defaultConfigs);

  if (!agent) return null;

  const history = agentHistory[agent.id] || [];
  const config = configs[agent.id] || defaultConfigs["review-reply"];

  const updateConfig = (key: keyof AgentConfig, value: AgentConfig[keyof AgentConfig]) => {
    setConfigs((prev) => ({
      ...prev,
      [agent.id]: { ...prev[agent.id], [key]: value },
    }));
  };

  const getStatusIcon = (status: HistoryEntry["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: HistoryEntry["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Failed
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>;
      case "medium":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case "low":
        return <Badge className="bg-muted text-muted-foreground border-border">Low</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                agent.iconColorClass
              )}
            >
              <agent.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle>{agent.name}</DialogTitle>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    agent.status === "active" && "bg-success animate-pulse",
                    agent.status === "paused" && "bg-muted-foreground",
                    agent.status === "error" && "bg-destructive"
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleAgent(agent.id)}
                className="gap-2"
              >
                {agent.enabled ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
          <div className="text-center">
            <p className="text-2xl font-semibold">{agent.metrics.tasksToday}</p>
            <p className="text-xs text-muted-foreground">Tasks Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{agent.metrics.successRate}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{agent.metrics.avgResponseTime}</p>
            <p className="text-xs text-muted-foreground">Avg Response</p>
          </div>
        </div>

        <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(entry.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{entry.action}</span>
                      </div>
                      {entry.details && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {entry.details}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(entry.status)}
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-6">
                {/* Auto Approve */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approve responses</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically publish without manual review
                    </p>
                  </div>
                  <Switch
                    checked={config.autoApprove}
                    onCheckedChange={(checked) => updateConfig("autoApprove", checked)}
                  />
                </div>

                {/* Max Tasks Per Hour */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max tasks per hour</Label>
                    <span className="text-sm font-medium">{config.maxTasksPerHour}</span>
                  </div>
                  <Slider
                    value={[config.maxTasksPerHour]}
                    onValueChange={([value]) => updateConfig("maxTasksPerHour", value)}
                    max={100}
                    min={1}
                    step={1}
                  />
                </div>

                {/* Priority Level */}
                <div className="space-y-2">
                  <Label>Priority level</Label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <Button
                        key={level}
                        variant={config.priorityLevel === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateConfig("priorityLevel", level)}
                        className="capitalize"
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: {getPriorityBadge(config.priorityLevel)}
                  </p>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about agent activity
                    </p>
                  </div>
                  <Switch
                    checked={config.notificationsEnabled}
                    onCheckedChange={(checked) => updateConfig("notificationsEnabled", checked)}
                  />
                </div>

                {/* Retry on Failure */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Retry on failure</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically retry failed tasks
                    </p>
                  </div>
                  <Switch
                    checked={config.retryOnFailure}
                    onCheckedChange={(checked) => updateConfig("retryOnFailure", checked)}
                  />
                </div>

                {/* Max Retries */}
                {config.retryOnFailure && (
                  <div className="space-y-2">
                    <Label>Max retry attempts</Label>
                    <Input
                      type="number"
                      value={config.maxRetries}
                      onChange={(e) => updateConfig("maxRetries", parseInt(e.target.value) || 1)}
                      min={1}
                      max={10}
                      className="w-24"
                    />
                  </div>
                )}

                {/* Reset to Defaults */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      setConfigs((prev) => ({
                        ...prev,
                        [agent.id]: defaultConfigs[agent.id],
                      }))
                    }
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to defaults
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Total Tasks (7 days)</p>
                    <p className="text-2xl font-semibold">{agent.metrics.tasksToday * 7}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Avg Tasks/Day</p>
                    <p className="text-2xl font-semibold">{agent.metrics.tasksToday}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Failed Tasks (7 days)</p>
                    <p className="text-2xl font-semibold">
                      {Math.round(agent.metrics.tasksToday * 7 * (1 - agent.metrics.successRate / 100))}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Time Saved (7 days)</p>
                    <p className="text-2xl font-semibold">
                      {Math.round(agent.metrics.tasksToday * 7 * 0.15)}h
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-medium mb-3">Performance Trend</p>
                  <div className="flex items-end gap-1 h-16">
                    {[65, 72, 68, 85, 78, 92, 88].map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t"
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Performance Note</p>
                      <p className="text-xs text-muted-foreground">
                        Success rate dropped 2% on Tuesday due to API rate limits.
                        Consider increasing retry delays.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
