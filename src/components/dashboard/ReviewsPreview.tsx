import { motion } from "framer-motion";
import { Star, MessageCircle, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const reviews = [
  {
    id: 1,
    platform: "TripAdvisor",
    author: "Sarah M.",
    rating: 5,
    excerpt: "Absolutely stunning hotel! The staff went above and beyond...",
    aiResponse: "Thank you so much, Sarah! We're delighted to hear you enjoyed...",
    status: "pending",
    time: "2 hours ago",
  },
  {
    id: 2,
    platform: "Google",
    author: "James K.",
    rating: 4,
    excerpt: "Great location and comfortable rooms. The breakfast could use more variety...",
    aiResponse: "Thank you for your feedback, James. We appreciate your kind words...",
    status: "pending",
    time: "5 hours ago",
  },
  {
    id: 3,
    platform: "Booking.com",
    author: "Maria L.",
    rating: 3,
    excerpt: "Room was clean but the AC wasn't working properly...",
    aiResponse: "Dear Maria, we sincerely apologize for the inconvenience...",
    status: "urgent",
    time: "1 day ago",
  },
];

export function ReviewsPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Pending Reviews</h3>
          <Badge variant="secondary" className="text-xs">
            8 new
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="text-accent gap-1">
          View all <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            className={cn(
              "p-4 rounded-lg border transition-all hover:border-accent/30 cursor-pointer",
              review.status === "urgent"
                ? "bg-destructive/5 border-destructive/20"
                : "bg-secondary/30 border-border"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{review.author}</span>
                <span className="text-xs text-muted-foreground">on {review.platform}</span>
                {review.status === "urgent" && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < review.rating ? "fill-warning text-warning" : "text-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{review.excerpt}</p>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-accent mb-1">AI-Generated Response</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{review.aiResponse}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">{review.time}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Edit
                </Button>
                <Button size="sm" className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                  Approve & Send
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
