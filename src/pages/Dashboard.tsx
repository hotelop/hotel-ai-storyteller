import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ReviewsPreview } from "@/components/dashboard/ReviewsPreview";
import { SocialCalendar } from "@/components/dashboard/SocialCalendar";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import {
  Star,
  MessageSquare,
  Share2,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle="Welcome back! Here's what's happening today." />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Reviews"
            value={8}
            change={-12}
            changeLabel="vs yesterday"
            icon={<Star className="w-5 h-5" />}
            iconColor="bg-warning/10 text-warning"
            delay={0}
          />
          <StatCard
            title="Messages Today"
            value={47}
            change={23}
            changeLabel="vs yesterday"
            icon={<MessageSquare className="w-5 h-5" />}
            iconColor="bg-success/10 text-success"
            delay={0.1}
          />
          <StatCard
            title="Social Engagement"
            value="12.4K"
            change={18}
            changeLabel="vs last week"
            icon={<Share2 className="w-5 h-5" />}
            iconColor="bg-info/10 text-info"
            delay={0.2}
          />
          <StatCard
            title="RevPAR Uplift"
            value="+14%"
            change={14}
            changeLabel="YoY growth"
            icon={<DollarSign className="w-5 h-5" />}
            iconColor="bg-accent/10 text-accent"
            delay={0.3}
          />
        </div>

        {/* Performance Chart */}
        <PerformanceChart />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Reviews & Social */}
          <div className="lg:col-span-2 space-y-6">
            <ReviewsPreview />
            <SocialCalendar />
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6">
            <RecentActivity />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Occupancy"
                value="87%"
                change={5}
                icon={<Users className="w-4 h-4" />}
                iconColor="bg-primary/10 text-primary"
                delay={0.4}
              />
              <StatCard
                title="Response Time"
                value="< 3h"
                change={-25}
                changeLabel="faster"
                icon={<TrendingUp className="w-4 h-4" />}
                iconColor="bg-success/10 text-success"
                delay={0.5}
              />
            </div>

            {/* AI Agent Summary */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-5 text-primary-foreground">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Agents Summary</h3>
                  <p className="text-sm text-primary-foreground/70">Last 24 hours</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/80">Reviews replied</span>
                  <span className="font-semibold">24</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/80">Posts scheduled</span>
                  <span className="font-semibold">6</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/80">Messages handled</span>
                  <span className="font-semibold">89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/80">Time saved</span>
                  <span className="font-semibold">12.5 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
