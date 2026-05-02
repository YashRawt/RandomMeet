import { useEffect, useState, useMemo, useRef } from "react";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  useGetNearbySessions,
  useGetMySession,
  useGetMatchSuggestions,
  useGetNearbyStats,
  useSendPing,
  useDeleteSession,
  getGetMySessionQueryKey,
  getGetNearbySessionsQueryKey,
  getGetMatchSuggestionsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Send, X, Zap, Users, Radio } from "lucide-react";

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  "pk.eyJ1IjoicmVwbGl0LWFza2xpbmUiLCJhIjoiY2x6cHVwdWZ6MDN6MjJ2bXh3eTNrZmxjZCJ9.tM-Zc9L0wOa9gHk3-uVXXQ";

const MOOD_COLORS: Record<string, string> = {
  chill:      "#8b5cf6",
  talkative:  "#f59e0b",
  networking: "#3b82f6",
  creative:   "#ec4899",
  open:       "#10b981",
};

const MOOD_LABELS: Record<string, string> = {
  chill: "Chill", talkative: "Talkative",
  networking: "Networking", creative: "Creative", open: "Open",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ── Glowing avatar marker for other users ── */
function PersonMarker({
  session,
  selected,
  onClick,
}: {
  session: any;
  selected: boolean;
  onClick: () => void;
}) {
  const color = MOOD_COLORS[session.mood] ?? "#6366f1";
  const init = initials(session.user.name);
  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer select-none"
      style={{ width: 44, height: 44 }}
    >
      {/* outer glow pulse */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: color, opacity: selected ? 0.35 : 0.18 }}
      />
      {/* selection ring */}
      {selected && (
        <div
          className="absolute -inset-1.5 rounded-full border-2"
          style={{ borderColor: color }}
        />
      )}
      {/* avatar circle */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/30"
        style={{
          background: color,
          boxShadow: `0 0 16px ${color}80, 0 2px 8px rgba(0,0,0,0.5)`,
        }}
      >
        {init}
      </div>
      {/* mood label chip */}
      <div
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap text-white"
        style={{ background: color, boxShadow: `0 1px 4px ${color}60` }}
      >
        {MOOD_LABELS[session.mood] ?? session.mood}
      </div>
    </div>
  );
}

/* ── Pulsing dot for the user themselves ── */
function YouMarker() {
  return (
    <div className="relative" style={{ width: 20, height: 20 }}>
      <div className="absolute -inset-3 rounded-full bg-sky-400/25 animate-ping" />
      <div className="absolute -inset-1.5 rounded-full bg-sky-400/20 border border-sky-300/40" />
      <div className="absolute inset-0 rounded-full bg-sky-400 border-2 border-white shadow-lg shadow-sky-400/60" />
    </div>
  );
}

/* ── Compass bearing decoration ── */
function CompassRose() {
  return (
    <div className="absolute top-3 right-3 w-10 h-10 pointer-events-none opacity-40">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="0.8" strokeDasharray="2 4" />
        <polygon points="20,4 22,18 20,22 18,18" fill="white" opacity="0.9" />
        <polygon points="20,36 22,22 20,18 18,22" fill="white" opacity="0.4" />
        <polygon points="4,20 18,18 22,20 18,22" fill="white" opacity="0.4" />
        <polygon points="36,20 22,18 18,20 22,22" fill="white" opacity="0.4" />
        <circle cx="20" cy="20" r="2" fill="white" />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { location, requestLocation, error: geoError, loading: geoLoading } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [pingMessage, setPingMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"nearby" | "matches">("nearby");

  const { data: mySession } = useGetMySession();

  useEffect(() => { requestLocation(); }, []);

  const queryParams = useMemo(() => {
    if (!location) return { lat: 0, lng: 0, radiusKm: 10 };
    return { lat: location.lat, lng: location.lng, radiusKm: 10 };
  }, [location]);

  const { data: nearbySessions } = useGetNearbySessions(queryParams, { query: { enabled: !!location } });
  const { data: stats } = useGetNearbyStats(queryParams, { query: { enabled: !!location } });
  const { data: suggestions } = useGetMatchSuggestions(queryParams, { query: { enabled: !!location } });

  const deleteSession = useDeleteSession();
  const sendPing = useSendPing();

  const handleEndSession = () => {
    if (!mySession?.session) return;
    deleteSession.mutate(mySession.session.id, {
      onSuccess: () => {
        toast({ title: "Session ended" });
        queryClient.invalidateQueries({ queryKey: getGetMySessionQueryKey() });
        if (location) {
          queryClient.invalidateQueries({ queryKey: getGetNearbySessionsQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetMatchSuggestionsQueryKey(queryParams) });
        }
      },
      onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleSendPing = (receiverId: number) => {
    sendPing.mutate(
      { data: { receiverId, message: pingMessage || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Ping sent! 🎯" });
          setSelectedSession(null);
          setPingMessage("");
        },
        onError: (err: any) => {
          const is429 = err.response?.status === 429;
          toast({
            title: is429 ? "Slow down" : "Failed",
            description: is429 ? "Too many pings. Wait a moment." : err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  /* ── Loading & error states ── */
  if (geoLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-400/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-sky-400/50 animate-ping" style={{ animationDelay: "0.3s" }} />
          <div className="absolute inset-4 rounded-full bg-sky-400 animate-pulse" />
        </div>
        <p className="text-slate-300 text-sm">Locating you…</p>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Location Required</h2>
        <p className="text-slate-400 max-w-sm mb-6">
          I AM HERE relies on your location to show people nearby. Please allow location access.
        </p>
        <Button onClick={requestLocation} className="bg-sky-500 hover:bg-sky-400 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  if (!location) return null;

  const nearbyCount = nearbySessions?.length ?? 0;
  const moodDist = (nearbySessions ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.mood] = (acc[s.mood] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodDist).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="h-full w-full flex overflow-hidden bg-slate-950">

      {/* ════════════ LEFT SIDEBAR ════════════ */}
      <aside className="w-72 flex-shrink-0 flex flex-col bg-slate-950 border-r border-white/8 overflow-hidden z-10">

        {/* ── header stats ── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-4">
            <Radio size={14} className="text-sky-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Live Radar</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Active</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3 border border-white/8">
              <p className="text-2xl font-black text-white tabular-nums">{nearbyCount}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">People nearby</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 border border-white/8">
              <p className="text-2xl font-black text-white tabular-nums">
                {stats?.avgDistanceKm ? stats.avgDistanceKm.toFixed(1) : "–"}
                <span className="text-sm font-normal text-slate-500"> km</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">Avg. distance</p>
            </div>
          </div>
          {topMood && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: MOOD_COLORS[topMood] }} />
              <span className="text-xs text-slate-300">
                Most common: <span className="font-semibold text-white">{MOOD_LABELS[topMood]}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── session status ── */}
        <div className="px-5 py-4 border-b border-white/8">
          {mySession?.session ? (
            <div className="rounded-xl border p-3 flex flex-col gap-2.5"
              style={{
                borderColor: MOOD_COLORS[mySession.session.mood ?? "open"] + "40",
                background: MOOD_COLORS[mySession.session.mood ?? "open"] + "12",
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: MOOD_COLORS[mySession.session.mood ?? "open"] }} />
                  <span className="text-xs font-semibold text-white">Your Session</span>
                </div>
                <button
                  onClick={handleEndSession}
                  disabled={deleteSession.isPending}
                  className="text-[10px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X size={10} />
                  End
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20"
                  style={{ background: MOOD_COLORS[mySession.session.mood ?? "open"] }}>
                  {mySession.session.mood?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white capitalize">{mySession.session.mood}</p>
                  <p className="text-[10px] text-slate-400">
                    Expires {formatDistanceToNow(new Date(mySession.session.expiresAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {mySession.session.status && (
                <p className="text-[11px] italic text-slate-300 border-t border-white/10 pt-2">
                  "{mySession.session.status}"
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 p-4 text-center">
              <p className="text-xs text-slate-500 mb-3">You're not visible on the map</p>
              <Link href="/session/create">
                <Button size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-white h-8 text-xs font-semibold">
                  <Zap size={12} className="mr-1.5" />
                  Start a Session
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── tabs ── */}
        <div className="flex border-b border-white/8 px-5">
          {(["nearby", "matches"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-3 text-xs font-semibold capitalize transition-colors relative"
              style={{ color: activeTab === t ? "white" : "#64748b" }}
            >
              {t === "nearby" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Users size={11} /> Nearby
                  {nearbyCount > 0 && (
                    <span className="bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                      {nearbyCount}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Zap size={11} /> Matches
                  {(suggestions?.length ?? 0) > 0 && (
                    <span className="bg-violet-500 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                      {suggestions!.length}
                    </span>
                  )}
                </span>
              )}
              {activeTab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── list content ── */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {activeTab === "nearby" && (
            <div className="divide-y divide-white/5">
              {!nearbySessions || nearbySessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Users size={20} className="text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500">Nobody nearby yet.<br />Check back in a minute.</p>
                </div>
              ) : (
                nearbySessions.map((session) => {
                  const color = MOOD_COLORS[session.mood] ?? "#6366f1";
                  const isSelected = selectedSession?.id === session.id;
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(isSelected ? null : session)}
                      className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
                      style={{ background: isSelected ? color + "18" : undefined }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold border border-white/20"
                        style={{
                          background: color,
                          boxShadow: isSelected ? `0 0 12px ${color}80` : `0 0 6px ${color}30`,
                        }}
                      >
                        {initials(session.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-white truncate">{session.user.name}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">{session.distanceKm.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ background: color + "80" }}>
                            {MOOD_LABELS[session.mood] ?? session.mood}
                          </span>
                          {session.status && (
                            <span className="text-[10px] text-slate-500 truncate italic">"{session.status}"</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "matches" && (
            <div className="divide-y divide-white/5">
              {!suggestions || suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Zap size={20} className="text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500">No AI matches yet.<br />Start a session first.</p>
                </div>
              ) : (
                suggestions.map((match, i) => {
                  const color = MOOD_COLORS[match.session.mood] ?? "#6366f1";
                  const pct = match.compatibilityScore;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSession(match.session)}
                      className="w-full px-5 py-4 flex flex-col gap-2 text-left hover:bg-white/4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold border border-white/20"
                          style={{ background: color, boxShadow: `0 0 8px ${color}40` }}
                        >
                          {initials(match.session.user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white">{match.session.user.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold flex-shrink-0" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {match.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-12">
                          {match.reasons.slice(0, 3).map((r: string, j: number) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full text-white/70 border border-white/10">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ════════════ MAP AREA ════════════ */}
      <div className="flex-1 relative overflow-hidden">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: location.lng, latitude: location.lat, zoom: 14 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          {/* User dot */}
          <Marker longitude={location.lng} latitude={location.lat} anchor="center">
            <YouMarker />
          </Marker>

          {/* Nearby people */}
          {nearbySessions?.map((session) => (
            <Marker
              key={session.id}
              longitude={session.approxLng}
              latitude={session.approxLat}
              anchor="center"
            >
              <PersonMarker
                session={session}
                selected={selectedSession?.id === session.id}
                onClick={() => setSelectedSession(
                  selectedSession?.id === session.id ? null : session
                )}
              />
            </Marker>
          ))}
        </Map>

        {/* compass decoration */}
        <CompassRose />

        {/* radius label */}
        <div className="absolute bottom-4 right-4 text-[10px] text-white/30 font-mono">
          10 km radius
        </div>

        {/* ── SLIDE-UP PING PANEL ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-out"
          style={{
            transform: selectedSession ? "translateY(0)" : "translateY(110%)",
            pointerEvents: selectedSession ? "auto" : "none",
          }}
        >
          {selectedSession && (() => {
            const color = MOOD_COLORS[selectedSession.mood] ?? "#6366f1";
            const init = initials(selectedSession.user.name);
            return (
              <div
                className="mx-4 mb-4 rounded-2xl border border-white/15 overflow-hidden shadow-2xl"
                style={{ background: "rgba(15,20,35,0.97)", backdropFilter: "blur(20px)" }}
              >
                {/* color accent top bar */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 border-white/20"
                        style={{ background: color, boxShadow: `0 0 20px ${color}60` }}
                      >
                        {init}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base leading-tight">{selectedSession.user.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                            style={{ background: color + "90" }}
                          >
                            {MOOD_LABELS[selectedSession.mood] ?? selectedSession.mood}
                          </span>
                          <span className="text-[10px] text-slate-500">{selectedSession.distanceKm.toFixed(1)} km away</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${selectedSession.user.id}`}>
                        <button className="text-[10px] text-slate-400 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5 transition-colors">
                          Profile
                        </button>
                      </Link>
                      <button
                        onClick={() => { setSelectedSession(null); setPingMessage(""); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {selectedSession.status && (
                    <p className="text-sm text-slate-300 italic mb-4 pl-1">"{selectedSession.status}"</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a message (optional)…"
                      value={pingMessage}
                      onChange={(e) => setPingMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendPing(selectedSession.user.id)}
                      className="flex-1 text-sm bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-white/30 transition-colors"
                    />
                    <button
                      onClick={() => handleSendPing(selectedSession.user.id)}
                      disabled={sendPing.isPending}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ background: color }}
                    >
                      {sendPing.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      Ping
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
