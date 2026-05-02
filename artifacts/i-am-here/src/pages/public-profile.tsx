import { useParams } from "wouter";
import { useGetUserById, useReportUser, useBlockUser, getGetBlockedUsersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, ShieldBan } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MOOD_COLORS: Record<string, string> = {
  chill: "#8b5cf6",
  talkative: "#f59e0b",
  networking: "#3b82f6",
  creative: "#ec4899",
  open: "#10b981",
};

export default function PublicProfile() {
  const { userId } = useParams();
  const id = parseInt(userId || "0");
  const { data: user, isLoading } = useGetUserById(id, { query: { enabled: !!id } });
  
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">User not found</div>;
  }

  const handleReport = () => {
    if (!reportReason) return;
    reportUser.mutate(
      { data: { reportedUserId: id, reason: reportReason } },
      {
        onSuccess: () => {
          toast({ title: "Report submitted", description: "Thank you for keeping the community safe." });
          setReportOpen(false);
          setReportReason("");
        },
        onError: (err) => {
          toast({ title: "Failed to submit report", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleBlock = () => {
    blockUser.mutate(
      { data: { blockedUserId: id } },
      {
        onSuccess: () => {
          toast({ title: "User blocked" });
          setBlockOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetBlockedUsersQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to block user", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Back to Map
      </Link>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <div className="h-32 bg-gradient-to-r from-primary/40 to-accent/40 w-full"></div>
        <CardContent className="pt-0 relative px-6 md:px-10">
          <div className="flex justify-between items-start">
            <div className="w-24 h-24 rounded-xl bg-card border-4 border-background flex items-center justify-center text-4xl font-bold -mt-12 overflow-hidden shadow-sm">
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground">{user.name.charAt(0)}</span>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setReportOpen(true)}>
                <AlertTriangle size={14} /> <span className="hidden sm:inline">Report</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setBlockOpen(true)}>
                <ShieldBan size={14} /> <span className="hidden sm:inline">Block</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 mb-6">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>

          {user.mood && (
            <div className="mb-6">
              <Badge variant="outline" className="text-sm px-3 py-1" style={{ borderColor: MOOD_COLORS[user.mood] }}>
                Usually feels: {user.mood}
              </Badge>
            </div>
          )}

          {user.bio && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h3>
              <p className="text-base leading-relaxed">{user.bio}</p>
            </div>
          )}

          {user.interests && user.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {user.interests.map(interest => (
                  <Badge key={interest} variant="secondary" className="bg-secondary/50">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please explain why you are reporting {user.name}. Your report will be reviewed by our team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Reason for reporting..." 
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReport} disabled={!reportReason || reportUser.isPending}>
              {reportUser.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Are you sure you want to block {user.name}? They will no longer see your sessions and cannot send you pings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={blockUser.isPending}>
              {blockUser.isPending ? "Blocking..." : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
