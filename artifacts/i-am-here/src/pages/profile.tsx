import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateProfile, getGetMeQueryKey, useGetBlockedUsers, getGetBlockedUsersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

const formSchema = z.object({
  name: z.string().min(2),
  bio: z.string().max(500).optional(),
  interests: z.string().transform(str => str.split(",").map(s => s.trim()).filter(Boolean)),
  mood: z.string().optional(),
  profilePic: z.string().url().optional().or(z.literal("")),
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();
  const { data: blockedUsers } = useGetBlockedUsers();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      bio: user?.bio || "",
      interests: (user?.interests || []).join(", "),
      mood: user?.mood || "",
      profilePic: user?.profilePic || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateProfile.mutate(
      { data: { ...values, profilePic: values.profilePic || undefined } },
      {
        onSuccess: (updatedUser) => {
          toast({ title: "Profile updated" });
          queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        },
        onError: (err) => {
          toast({ title: "Update failed", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your public persona.</p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Public Information</CardTitle>
            <CardDescription>This is what others see when you broadcast a session or send a ping.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="profilePic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/avatar.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell people a bit about yourself..." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interests (comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="coffee, react, hiking" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Mood</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a default mood" />
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
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium">@{user.username}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-medium">{format(new Date(user.createdAt), 'MMMM yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Blocked Users</CardTitle>
            <CardDescription>Users you have blocked will not see your sessions and cannot ping you.</CardDescription>
          </CardHeader>
          <CardContent>
            {(!blockedUsers || blockedUsers.length === 0) ? (
              <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map(b => (
                  <div key={b.id} className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                    <div>
                      <p className="font-medium text-sm">{b.blockedUser?.name}</p>
                      <p className="text-xs text-muted-foreground">@{b.blockedUser?.username}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Blocked {format(new Date(b.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
