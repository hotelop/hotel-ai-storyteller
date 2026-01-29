import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Star,
  Clock,
  Download,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const revenueData = [
  { month: "Jul", revenue: 42000, aiContribution: 8400 },
  { month: "Aug", revenue: 48000, aiContribution: 11520 },
  { month: "Sep", revenue: 52000, aiContribution: 14040 },
  { month: "Oct", revenue: 58000, aiContribution: 17400 },
  { month: "Nov", revenue: 71000, aiContribution: 24850 },
  { month: "Dec", revenue: 89000, aiContribution: 35600 },
  { month: "Jan", revenue: 94000, aiContribution: 39480 },
];

const channelData = [
  { name: "Direct", value: 35 },
  { name: "OTA", value: 40 },
  { name: "Social", value: 15 },
  { name: "Email", value: 10 },
];

const sentimentData = [
  { rating: "5 Stars", count: 124, percentage: 52 },
  { rating: "4 Stars", count: 78, percentage: 33 },
  { rating: "3 Stars", count: 24, percentage: 10 },
  { rating: "2 Stars", count: 8, percentage: 3 },
  { rating: "1 Star", count: 5, percentage: 2 },
];

const COLORS = ["hsl(35, 90%, 55%)", "hsl(210, 80%, 55%)", "hsl(142, 70%, 45%)", "hsl(280, 60%, 55%)"];

export default function Analytics() {
  return (
    <div className="min-h-screen">
      <Header title="Analytics" subtitle="Track performance and ROI across all agents" />

      <div className="p-6">
        {/* Time Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Last 7 Days</Button>
            <Button variant="ghost" size="sm">Last 30 Days</Button>
            <Button variant="ghost" size="sm">Last 90 Days</Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Custom
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center gap-1 text-success text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+14%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">RevPAR</p>
            <p className="text-2xl font-semibold">$187</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div className="flex items-center gap-1 text-success text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+8%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Occupancy</p>
            <p className="text-2xl font-semibold">87%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <div className="flex items-center gap-1 text-success text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+0.3</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-semibold">4.6</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div className="flex items-center gap-1 text-success text-xs">
                <TrendingDown className="w-3 h-3" />
                <span>-42%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Response Time</p>
            <p className="text-2xl font-semibold">2.4h</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">Revenue & AI Contribution</h3>
                <p className="text-sm text-muted-foreground">Monthly revenue breakdown</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Total Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-muted-foreground">AI Contribution</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(220, 45%, 20%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(220, 45%, 20%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 15%, 88%)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(35, 15%, 88%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(220, 45%, 20%)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="aiContribution" stroke="hsl(35, 90%, 55%)" strokeWidth={2} fillOpacity={1} fill="url(#colorAI)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Channel Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h3 className="font-semibold mb-5">Booking Channels</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {channelData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="text-sm font-medium ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sentiment Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-card rounded-xl border border-border p-5"
        >
          <h3 className="font-semibold mb-5">Review Sentiment Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 15%, 88%)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }} />
                <YAxis dataKey="rating" type="category" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(35, 15%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(35, 90%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ROI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground"
        >
          <h3 className="font-semibold text-lg mb-4">AI Agents ROI Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-primary-foreground/70 text-sm mb-1">Time Saved</p>
              <p className="text-2xl font-bold">247 hrs</p>
              <p className="text-xs text-primary-foreground/60">This month</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-sm mb-1">Labor Cost Saved</p>
              <p className="text-2xl font-bold">$4,940</p>
              <p className="text-xs text-primary-foreground/60">@$20/hr</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-sm mb-1">Revenue Attributed</p>
              <p className="text-2xl font-bold">$39,480</p>
              <p className="text-xs text-primary-foreground/60">From AI actions</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-sm mb-1">ROI Ratio</p>
              <p className="text-2xl font-bold">8.2x</p>
              <p className="text-xs text-primary-foreground/60">Return on investment</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
