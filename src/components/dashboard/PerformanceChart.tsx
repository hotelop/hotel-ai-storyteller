import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", revenue: 42000, bookings: 240 },
  { name: "Feb", revenue: 38000, bookings: 210 },
  { name: "Mar", revenue: 52000, bookings: 295 },
  { name: "Apr", revenue: 48000, bookings: 270 },
  { name: "May", revenue: 61000, bookings: 345 },
  { name: "Jun", revenue: 75000, bookings: 420 },
  { name: "Jul", revenue: 89000, bookings: 510 },
];

export function PerformanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-sm text-muted-foreground">Monthly performance tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-info" />
            <span className="text-xs text-muted-foreground">Bookings</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 15%, 88%)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(35, 15%, 88%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px hsl(220, 25%, 12%, 0.08)",
              }}
              formatter={(value: number, name: string) => [
                name === "revenue" ? `$${value.toLocaleString()}` : value,
                name === "revenue" ? "Revenue" : "Bookings",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(35, 90%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="hsl(210, 80%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBookings)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
