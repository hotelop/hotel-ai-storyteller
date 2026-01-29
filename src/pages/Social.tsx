import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Plus,
  Calendar,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share,
  MoreVertical,
  Sparkles,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";

const scheduledPosts = [
  {
    id: 1,
    platforms: ["instagram", "facebook"],
    title: "Summer Pool Vibes 🌴",
    content: "Dive into relaxation this summer at our stunning rooftop pool. Book now and get 20% off your stay! #SummerGetaway #HotelLife",
    scheduledFor: "Today, 2:00 PM",
    scheduledDate: new Date(),
    status: "scheduled",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop",
    estimatedReach: "2.1K",
    aiGenerated: true,
  },
  {
    id: 2,
    platforms: ["facebook", "linkedin"],
    title: "Weekend Getaway Package",
    content: "Escape the city stress with our exclusive weekend package. Includes breakfast, spa access, and a complimentary room upgrade.",
    scheduledFor: "Tomorrow, 10:00 AM",
    scheduledDate: addDays(new Date(), 1),
    status: "scheduled",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop",
    estimatedReach: "1.8K",
    aiGenerated: true,
  },
  {
    id: 3,
    platforms: ["linkedin"],
    title: "Business Travel Excellence",
    content: "Our business center is now open 24/7 with high-speed WiFi, private meeting rooms, and complimentary coffee.",
    scheduledFor: "Wed, 9:00 AM",
    scheduledDate: addDays(new Date(), 2),
    status: "draft",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop",
    estimatedReach: "950",
    aiGenerated: false,
  },
  {
    id: 4,
    platforms: ["instagram"],
    title: "Sunset Views 🌅",
    content: "Witness breathtaking sunsets from our Sky Lounge every evening. Perfect for romantic dinners or client entertainment.",
    scheduledFor: "Thu, 6:00 PM",
    scheduledDate: addDays(new Date(), 3),
    status: "scheduled",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop",
    estimatedReach: "3.2K",
    aiGenerated: true,
  },
];

const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
};

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-500",
  facebook: "bg-blue-600/10 text-blue-600",
  linkedin: "bg-blue-700/10 text-blue-700",
  twitter: "bg-sky-500/10 text-sky-500",
};

export default function Social() {
  const [selectedPost, setSelectedPost] = useState(scheduledPosts[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate week days starting from Monday of the current week view
  const weekDays = useMemo(() => {
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));
  }, [selectedDate]);

  // Check if a date has scheduled posts
  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter((post) => isSameDay(post.scheduledDate, date));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const postsOnDate = getPostsForDate(date);
    if (postsOnDate.length > 0) {
      setSelectedPost(postsOnDate[0]);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Social Posting" subtitle="Schedule and manage your social media content" />

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Scheduled</p>
            <p className="text-2xl font-semibold">12</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Published This Week</p>
            <p className="text-2xl font-semibold text-success">8</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Total Reach</p>
            <p className="text-2xl font-semibold">24.5K</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
            <p className="text-2xl font-semibold text-accent">4.8%</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Content Calendar</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mini Calendar Week */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDays.map((date) => {
                const postsOnDate = getPostsForDate(date);
                const isSelected = isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, currentMonth);

                return (
                  <div key={date.toISOString()} className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      {format(date, "EEE")}
                    </p>
                    <div
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all",
                        isSelected
                          ? "bg-accent text-accent-foreground shadow-md"
                          : "bg-secondary/50 hover:bg-secondary hover:scale-105",
                        !isCurrentMonth && "opacity-50"
                      )}
                    >
                      <span className="text-sm font-medium">{format(date, "d")}</span>
                      {postsOnDate.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {postsOnDate.slice(0, 2).map((post, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1 h-1 rounded-full",
                                post.platforms.includes("instagram") ? "bg-pink-500" : "bg-blue-600"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scheduled Posts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Posts for {format(selectedDate, "MMM d, yyyy")}
                </h4>
                <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="w-4 h-4" />
                  Create Post
                </Button>
              </div>

              {getPostsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No posts scheduled for this day</p>
                </div>
              ) : getPostsForDate(selectedDate).map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => setSelectedPost(post)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedPost.id === post.id
                      ? "bg-accent/5 border-accent/30"
                      : "bg-secondary/30 border-border hover:border-accent/20"
                  )}
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      {post.aiGenerated && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI
                        </Badge>
                      )}
                      <Badge
                        variant={post.status === "scheduled" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {post.platforms.map((p) => {
                          const Icon = platformIcons[p];
                          return (
                            <div
                              key={p}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center",
                                platformColors[p]
                              )}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground">{post.scheduledFor}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-accent">
                    <Eye className="w-3 h-3" />
                    <span>{post.estimatedReach}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Post Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Post Preview</h3>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview Card */}
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full aspect-square object-cover"
              />
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <Heart className="w-5 h-5 text-muted-foreground" />
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  <Share className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm mb-2">
                  <span className="font-semibold">hotelname</span>
                </p>
                <p className="text-sm text-muted-foreground">{selectedPost.content}</p>
              </div>
            </div>

            {/* Post Details */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platforms</span>
                <div className="flex gap-1">
                  {selectedPost.platforms.map((p) => {
                    const Icon = platformIcons[p];
                    return (
                      <div
                        key={p}
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          platformColors[p]
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <span className="font-medium">{selectedPost.scheduledFor}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Est. Reach</span>
                <span className="font-medium text-accent">{selectedPost.estimatedReach}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1">
                Edit
              </Button>
              <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
                <Sparkles className="w-4 h-4" />
                Optimize
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
