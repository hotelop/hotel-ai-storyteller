import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  User,
  Clock,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const conversations = [
  {
    id: 1,
    guest: "Emma Watson",
    channel: "whatsapp",
    lastMessage: "What time is check-in?",
    aiResponse: "Check-in starts at 3:00 PM. Early check-in is available upon request.",
    time: "2 min ago",
    unread: true,
    booking: "Jan 15-18",
  },
  {
    id: 2,
    guest: "Michael Chen",
    channel: "email",
    lastMessage: "Can I request a room with a city view?",
    aiResponse: "Absolutely! I've noted your preference for a city view room.",
    time: "15 min ago",
    unread: true,
    booking: "Jan 20-22",
  },
  {
    id: 3,
    guest: "Sophie Martin",
    channel: "booking",
    lastMessage: "Is airport pickup available?",
    aiResponse: "Yes, we offer airport pickup for $45. Would you like me to arrange this?",
    time: "1 hr ago",
    unread: false,
    booking: "Feb 1-5",
  },
  {
    id: 4,
    guest: "David Kim",
    channel: "sms",
    lastMessage: "Thank you for the upgrade!",
    aiResponse: "You're most welcome! We hope you enjoy the suite.",
    time: "3 hr ago",
    unread: false,
    booking: "Jan 12-14",
  },
];

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Phone,
  booking: MessageSquare,
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-500",
  email: "bg-blue-500/10 text-blue-500",
  sms: "bg-purple-500/10 text-purple-500",
  booking: "bg-orange-500/10 text-orange-500",
};

export default function Messaging() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);

  const messages = [
    { id: 1, type: "guest", text: selectedConversation.lastMessage, time: selectedConversation.time },
    { id: 2, type: "ai", text: selectedConversation.aiResponse, time: "Just now" },
  ];

  return (
    <div className="min-h-screen">
      <Header title="Messaging" subtitle="Manage guest communications across all channels" />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Active Conversations</p>
            <p className="text-2xl font-semibold">23</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Unread</p>
            <p className="text-2xl font-semibold text-warning">4</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">AI Handled</p>
            <p className="text-2xl font-semibold text-success">89%</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Avg Response</p>
            <p className="text-2xl font-semibold">2 min</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversation List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl border border-border flex flex-col"
          >
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search guests..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {conversations.map((conv) => {
                const Icon = channelIcons[conv.channel];
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors",
                      selectedConversation.id === conv.id
                        ? "bg-accent/5 border-l-2 border-l-accent"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{conv.guest}</p>
                          <span className="text-xs text-muted-foreground">{conv.time}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center", channelColors[conv.channel])}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="text-xs text-muted-foreground">{conv.booking}</span>
                          {conv.unread && (
                            <Badge variant="default" className="text-xs bg-accent text-accent-foreground">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Chat View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col"
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.guest}</p>
                  <p className="text-xs text-muted-foreground">
                    Booking: {selectedConversation.booking}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  View Booking
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Upsell
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.type === "ai" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl p-4",
                      msg.type === "ai"
                        ? "bg-accent text-accent-foreground rounded-br-sm"
                        : "bg-secondary rounded-bl-sm"
                    )}
                  >
                    {msg.type === "ai" && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-xs font-medium">AI Response</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.text}</p>
                    <p className={cn("text-xs mt-2", msg.type === "ai" ? "text-accent-foreground/70" : "text-muted-foreground")}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Replies */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                <Button variant="outline" size="sm" className="whitespace-nowrap text-xs">
                  Confirm Booking
                </Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap text-xs">
                  Send Check-in Info
                </Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  Offer Upgrade
                </Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap text-xs">
                  Request Review
                </Button>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2">
                <Input placeholder="Type a message or let AI respond..." className="flex-1" />
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
