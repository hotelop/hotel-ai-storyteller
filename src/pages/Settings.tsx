import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Link,
  Bell,
  Shield,
  Palette,
  Users,
  Sparkles,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const integrations = [
  { name: "TripAdvisor", status: "connected", icon: "🧳" },
  { name: "Google Business", status: "connected", icon: "🔍" },
  { name: "Booking.com", status: "connected", icon: "🏨" },
  { name: "Expedia", status: "connected", icon: "✈️" },
  { name: "Facebook", status: "connected", icon: "📘" },
  { name: "Instagram", status: "connected", icon: "📸" },
  { name: "WhatsApp Business", status: "pending", icon: "💬" },
  { name: "Mailchimp", status: "disconnected", icon: "📧" },
];

export default function Settings() {
  return (
    <div className="min-h-screen">
      <Header title="Settings" subtitle="Configure your hotel and agent preferences" />

      <div className="p-6">
        <Tabs defaultValue="property" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="property" className="gap-2">
              <Building2 className="w-4 h-4" />
              Property
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Link className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Agents
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="property">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h3 className="font-semibold">Property Information</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input defaultValue="Grand Plaza Hotel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input defaultValue="123 Main Street, City Center" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input defaultValue="New York" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input defaultValue="United States" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Input defaultValue="Luxury Hotel" />
                  </div>
                </div>

                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Save Changes
                </Button>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h3 className="font-semibold">Brand Voice</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tone of Voice</Label>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">Professional</Button>
                      <Button variant="outline" size="sm">Friendly</Button>
                      <Button variant="outline" size="sm">Casual</Button>
                      <Button variant="outline" size="sm">Luxury</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Key Selling Points</Label>
                    <Input placeholder="e.g., Rooftop pool, City views, 24/7 concierge" />
                  </div>

                  <div className="space-y-2">
                    <Label>Signature Sign-off</Label>
                    <Input defaultValue="The Grand Plaza Team" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Use Guest Names</p>
                      <p className="text-xs text-muted-foreground">Personalize responses with guest names</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Multilingual Responses</p>
                      <p className="text-xs text-muted-foreground">Reply in guest's language</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="integrations">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-semibold mb-6">Connected Platforms</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        <p className={cn(
                          "text-xs",
                          integration.status === "connected" && "text-success",
                          integration.status === "pending" && "text-warning",
                          integration.status === "disconnected" && "text-muted-foreground"
                        )}>
                          {integration.status === "connected" && "✓ Connected"}
                          {integration.status === "pending" && "⏳ Pending setup"}
                          {integration.status === "disconnected" && "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={integration.status === "connected" ? "outline" : "default"}
                      size="sm"
                      className={integration.status !== "connected" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                    >
                      {integration.status === "connected" ? "Manage" : "Connect"}
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="agents">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-6">AI Agent Settings</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">Review Reply Agent</p>
                        <p className="text-sm text-muted-foreground">Auto-generate review responses</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="font-medium">Social Posting Agent</p>
                        <p className="text-sm text-muted-foreground">Generate and schedule posts</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">Messaging Agent</p>
                        <p className="text-sm text-muted-foreground">Handle guest inquiries</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">Campaign Agent</p>
                        <p className="text-sm text-muted-foreground">Create seasonal campaigns</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Auto-Approval Mode</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable to let AI agents automatically publish responses and posts without manual approval.
                        Recommended only after testing agent performance.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Switch />
                        <span className="text-sm text-muted-foreground">Currently disabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-semibold mb-6">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">New Reviews</p>
                    <p className="text-xs text-muted-foreground">Get notified when new reviews are posted</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">Negative Reviews</p>
                    <p className="text-xs text-muted-foreground">Urgent alerts for 3-star or below reviews</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">Guest Messages</p>
                    <p className="text-xs text-muted-foreground">New guest inquiries and messages</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">Campaign Performance</p>
                    <p className="text-xs text-muted-foreground">Weekly campaign analytics summary</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">AI Agent Activity</p>
                    <p className="text-xs text-muted-foreground">Daily summary of agent actions</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
