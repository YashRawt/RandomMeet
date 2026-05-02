import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSession, useGetMySession, getGetMySessionQueryKey } from "@workspace/api-client-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  status: z.string().min(5).max(100),
  mood: z.string().min(1),
  durationMinutes: z.coerce.number().min(15).max(480),
  placeName: z.string().optional(),
});

export default function SessionCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { location, requestLocation, error: geoError, loading: geoLoading } = useGeolocation();
  const queryClient = useQueryClient();

  const { data: mySession } = useGetMySession();

  useEffect(() => {
    requestLocation();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "",
      mood: "chill",
      durationMinutes: 60,
      placeName: "",
    },
  });

  const createSession = useCreateSession();

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!location) {
      toast({ title: "Location required", description: "We need your location to create a session", variant: "destructive" });
      return;
    }

    createSession.mutate(
      { 
        data: { 
          ...values, 
          lat: location.lat, 
          lng: location.lng 
        } 
      },
      {
        onSuccess: (data) => {
          toast({ title: "Session created!" });
          queryClient.setQueryData(getGetMySessionQueryKey(), { session: data });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Failed to create session",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  }

  if (mySession?.session) {
    return (
      <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✨</span>
          </div>
          <h2 className="text-2xl font-bold">You already have an active session</h2>
          <p className="text-muted-foreground">You are currently broadcasting your presence. End your current session to create a new one.</p>
          <div className="pt-4 flex justify-center gap-4">
            <Link href="/dashboard">
              <Button>Go to Map</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Broadcast Presence</h1>
        <p className="text-muted-foreground mt-2">Let people nearby know what you're up for.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status / Intent</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. Working on a side project, would love to chat about React" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>What are you doing? What kind of interaction do you want?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vibe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a mood" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chill">Chill</SelectItem>
                        <SelectItem value="talkative">Talkative</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="open">Open to anything</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How long?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="placeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Blue Bottle Coffee" {...field} />
                  </FormControl>
                  <FormDescription>If you're at a specific venue, let people know.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t border-border">
              {geoLoading ? (
                <p className="text-sm text-muted-foreground mb-4">Getting your location...</p>
              ) : geoError ? (
                <p className="text-sm text-destructive mb-4">Location error: {geoError}</p>
              ) : location ? (
                <p className="text-sm text-green-600 mb-4">Location acquired successfully.</p>
              ) : null}
              
              <Button type="submit" className="w-full md:w-auto" disabled={createSession.isPending || !location}>
                {createSession.isPending ? "Starting session..." : "Start Session"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
