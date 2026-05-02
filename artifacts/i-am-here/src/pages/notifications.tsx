import { useGetMyPings, useRespondToPing, getGetMyPingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, User, Check, X, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Notifications() {
  const { data: pings, isLoading } = useGetMyPings();
  const respondToPing = useRespondToPing();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRespond = (pingId: number, action: "accept" | "reject") => {
    respondToPing.mutate(
      { pingId, data: { action } },
      {
        onSuccess: () => {
          toast({ title: `Ping ${action}ed` });
          queryClient.invalidateQueries({ queryKey: getGetMyPingsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Action failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const received = pings?.received || [];
  const sent = pings?.sent || [];

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pings</h1>
        <p className="text-muted-foreground mt-2">Manage your connection requests.</p>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="received" className="relative">
            Received
            {received.filter(p => p.status === 'pending').length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {received.filter(p => p.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="space-y-4">
          {received.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-border border-dashed">
              No received pings yet. Create a session to get discovered!
            </div>
          ) : (
            received.map((ping) => (
              <Card key={ping.id} className={ping.status === "pending" ? "border-primary/50 shadow-md" : "opacity-70"}>
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
                        {ping.sender?.name.charAt(0)}
                      </div>
                      <div>
                        <Link href={`/profile/${ping.senderId}`} className="font-semibold hover:underline">
                          {ping.sender?.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ping.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      ping.status === "accepted" ? "default" : 
                      ping.status === "rejected" ? "destructive" : "outline"
                    }>
                      {ping.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {ping.message && (
                    <div className="bg-muted p-3 rounded-md text-sm border-l-2 border-primary mt-2">
                      "{ping.message}"
                    </div>
                  )}
                  
                  {ping.status === "accepted" && ping.revealedLat && ping.revealedLng && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-start gap-3">
                      <MapPin className="text-green-600 mt-0.5 shrink-0" size={18} />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">Location Revealed</p>
                        <p className="text-xs text-green-700/80 dark:text-green-500/80 mt-1 break-all">
                          Lat: {ping.revealedLat.toFixed(5)}, Lng: {ping.revealedLng.toFixed(5)}
                        </p>
                        <Button size="sm" variant="outline" className="mt-2 text-xs h-7 border-green-500/30">
                          Open in Maps
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                
                {ping.status === "pending" && (
                  <CardFooter className="px-5 pb-5 pt-0 gap-3">
                    <Button 
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" 
                      onClick={() => handleRespond(ping.id, "accept")}
                      disabled={respondToPing.isPending}
                    >
                      <Check size={16} /> Accept
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRespond(ping.id, "reject")}
                      disabled={respondToPing.isPending}
                    >
                      <X size={16} /> Decline
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="space-y-4">
          {sent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-border border-dashed">
              You haven't sent any pings yet. Check the map to find people nearby!
            </div>
          ) : (
            sent.map((ping) => (
              <Card key={ping.id}>
                <CardHeader className="py-4 px-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                        {ping.receiver?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sent to</p>
                        <Link href={`/profile/${ping.receiverId}`} className="font-semibold text-sm hover:underline">
                          {ping.receiver?.name}
                        </Link>
                      </div>
                    </div>
                    <Badge variant={
                      ping.status === "accepted" ? "default" : 
                      ping.status === "rejected" ? "destructive" : "secondary"
                    }>
                      {ping.status}
                    </Badge>
                  </div>
                </CardHeader>
                {ping.message && (
                  <CardContent className="px-5 pb-4 pt-0">
                    <p className="text-xs text-muted-foreground mb-1">Your message:</p>
                    <p className="text-sm bg-muted p-2 rounded">{ping.message}</p>
                  </CardContent>
                )}
                {ping.status === "accepted" && ping.revealedLat && (
                  <CardFooter className="px-5 py-3 bg-green-500/10 border-t border-green-500/20">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-green-600" size={16} />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">They shared their exact location with you!</span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
