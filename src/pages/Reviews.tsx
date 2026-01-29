import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  Sparkles,
  Filter,
  Search,
  Check,
  X,
  ExternalLink,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const reviews = [
  {
    id: 1,
    platform: "TripAdvisor",
    platformLogo: "🧳",
    author: "Sarah Mitchell",
    rating: 5,
    date: "2 hours ago",
    title: "Absolutely stunning hotel!",
    content:
      "The staff went above and beyond to make our anniversary special. The room had a beautiful view of the city, and the breakfast buffet was exceptional. We will definitely be returning!",
    aiResponse:
      "Dear Sarah, thank you so much for your wonderful review! We're absolutely delighted to hear that your anniversary celebration was made special at our hotel. Our team takes great pride in creating memorable experiences for our guests. We look forward to welcoming you back soon!",
    sentiment: "positive",
    status: "pending",
  },
  {
    id: 2,
    platform: "Google",
    platformLogo: "🔍",
    author: "James Kennedy",
    rating: 4,
    date: "5 hours ago",
    title: "Great location, minor issues",
    content:
      "The hotel is perfectly located for exploring the city. Rooms are comfortable and clean. Only minor complaint is that the breakfast could use more variety, especially for vegetarians.",
    aiResponse:
      "Thank you for your feedback, James! We're pleased you enjoyed our central location and comfortable accommodations. Your suggestion about expanding our vegetarian breakfast options is valuable, and we've shared it with our culinary team. We hope to welcome you again soon!",
    sentiment: "positive",
    status: "pending",
  },
  {
    id: 3,
    platform: "Booking.com",
    platformLogo: "🏨",
    author: "Maria Lopez",
    rating: 3,
    date: "1 day ago",
    title: "AC problems during stay",
    content:
      "The room was clean and well-decorated, but unfortunately the air conditioning wasn't working properly during our stay. Staff tried to fix it but the issue persisted. Expected better for the price.",
    aiResponse:
      "Dear Maria, we sincerely apologize for the inconvenience caused by the air conditioning issues during your stay. This is not the standard of comfort we aim to provide. We have since had our HVAC system fully serviced. As a gesture of goodwill, we'd like to offer you a discount on your next stay. Please contact us directly to arrange this.",
    sentiment: "negative",
    status: "urgent",
  },
  {
    id: 4,
    platform: "Expedia",
    platformLogo: "✈️",
    author: "Robert Chen",
    rating: 5,
    date: "2 days ago",
    title: "Business travel perfection",
    content:
      "Stayed for a week-long business trip. Fast WiFi, quiet rooms, excellent gym, and the business center was well-equipped. The location made it easy to get to meetings across the city.",
    aiResponse:
      "Thank you Robert! We're thrilled our hotel met all your business travel needs. Our facilities are designed with professionals like you in mind. We appreciate your detailed feedback and look forward to being your home away from home on future business trips!",
    sentiment: "positive",
    status: "approved",
  },
];

export default function Reviews() {
  const [selectedReview, setSelectedReview] = useState(reviews[0]);
  const [editedResponse, setEditedResponse] = useState(selectedReview.aiResponse);
  const [filter, setFilter] = useState<"all" | "pending" | "urgent" | "approved">("all");

  const filteredReviews = reviews.filter((r) => filter === "all" || r.status === filter);

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    urgent: reviews.filter((r) => r.status === "urgent").length,
    avgRating: (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1),
  };

  return (
    <div className="min-h-screen">
      <Header title="Reviews" subtitle="Manage and respond to guest reviews across all platforms" />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Total Reviews</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-semibold text-warning">{stats.pending}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Urgent</p>
            <p className="text-2xl font-semibold text-destructive">{stats.urgent}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <p className="text-sm text-muted-foreground mb-1">Avg. Rating</p>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-semibold">{stats.avgRating}</p>
              <Star className="w-5 h-5 fill-warning text-warning" />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl border border-border"
          >
            {/* Filters */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search reviews..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                {(["all", "pending", "urgent", "approved"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "capitalize text-xs",
                      filter === f && "bg-accent text-accent-foreground"
                    )}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>

            {/* Review Items */}
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => {
                    setSelectedReview(review);
                    setEditedResponse(review.aiResponse);
                  }}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-secondary/50",
                    selectedReview.id === review.id && "bg-accent/5 border-l-2 border-l-accent"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{review.platformLogo}</span>
                      <div>
                        <p className="font-medium text-sm">{review.author}</p>
                        <p className="text-xs text-muted-foreground">{review.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < review.rating ? "fill-warning text-warning" : "text-muted"
                            )}
                          />
                        ))}
                      </div>
                      {review.status === "urgent" && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                      {review.status === "approved" && (
                        <Badge className="text-xs bg-success text-success-foreground">
                          Sent
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{review.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{review.content}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{review.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Response Editor */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl border border-border p-5 space-y-5"
          >
            {/* Original Review */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Original Review</h3>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View on {selectedReview.platform} <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{selectedReview.platformLogo}</span>
                  <p className="font-medium text-sm">{selectedReview.author}</p>
                  <div className="flex gap-0.5 ml-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3 h-3",
                          i < selectedReview.rating ? "fill-warning text-warning" : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="font-medium text-sm mb-2">{selectedReview.title}</p>
                <p className="text-sm text-muted-foreground">{selectedReview.content}</p>
              </div>
            </div>

            {/* AI Response */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-accent" />
                </div>
                <h3 className="font-semibold">AI-Generated Response</h3>
                <Badge variant="secondary" className="text-xs">
                  Editable
                </Badge>
              </div>
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                className="min-h-[150px] resize-none"
                placeholder="AI response will appear here..."
              />
              <div className="flex items-center gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm">
                  Make More Formal
                </Button>
                <Button variant="outline" size="sm">
                  Add Apology
                </Button>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <h4 className="text-sm font-medium mb-3">Sentiment Analysis</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp
                    className={cn(
                      "w-4 h-4",
                      selectedReview.sentiment === "positive" ? "text-success" : "text-muted"
                    )}
                  />
                  <span className="text-sm">Positive</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown
                    className={cn(
                      "w-4 h-4",
                      selectedReview.sentiment === "negative" ? "text-destructive" : "text-muted"
                    )}
                  />
                  <span className="text-sm">Negative</span>
                </div>
              </div>
              {selectedReview.sentiment === "negative" && (
                <div className="mt-3 p-3 rounded bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium">Attention Required</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This review mentions specific issues (AC problems). Consider offering compensation.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="ghost" size="sm" className="gap-1 text-destructive">
                <X className="w-4 h-4" />
                Discard
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Save Draft
                </Button>
                <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Check className="w-4 h-4" />
                  Approve & Publish
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
