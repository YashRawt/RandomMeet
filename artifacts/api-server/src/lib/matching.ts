import type { User } from "@workspace/db";

interface SessionWithUser {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  approxLat: number;
  approxLng: number;
  placeName: string | null;
  status: string;
  mood: string;
  expiresAt: Date;
  distanceKm: number;
  user: {
    id: number;
    name: string;
    username: string;
    bio: string | null;
    interests: string[];
    mood: string | null;
    profilePic: string | null;
  };
}

export interface MatchSuggestion {
  session: SessionWithUser;
  compatibilityScore: number;
  reasons: string[];
}

export function computeCompatibility(
  myUser: User,
  candidateSession: SessionWithUser,
  distanceKm: number
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const myInterests = (myUser.interests ?? []).map((i) => i.toLowerCase());
  const theirInterests = (candidateSession.user.interests ?? []).map((i) => i.toLowerCase());

  const sharedInterests = myInterests.filter((i) => theirInterests.includes(i));
  const interestScore = Math.min(40, sharedInterests.length * 12);
  score += interestScore;
  if (sharedInterests.length > 0) {
    reasons.push(`${sharedInterests.length} shared interest${sharedInterests.length > 1 ? "s" : ""}: ${sharedInterests.slice(0, 2).join(", ")}`);
  }

  const moodCompatibility: Record<string, string[]> = {
    chill: ["chill", "open", "creative"],
    talkative: ["talkative", "networking", "open"],
    networking: ["networking", "talkative", "open"],
    creative: ["creative", "chill", "open"],
    open: ["open", "chill", "talkative", "networking", "creative"],
  };

  const myMood = myUser.mood ?? "open";
  const theirMood = candidateSession.user.mood ?? candidateSession.mood;
  const compatMoods = moodCompatibility[myMood] ?? [];
  if (compatMoods.includes(theirMood)) {
    score += 25;
    if (myMood === theirMood) {
      reasons.push(`Same vibe: ${myMood}`);
    } else {
      reasons.push(`Compatible moods`);
    }
  }

  const distScore = Math.max(0, 20 - Math.round(distanceKm * 5));
  score += distScore;
  if (distanceKm < 0.5) {
    reasons.push("Very close by");
  } else if (distanceKm < 1.5) {
    reasons.push("Nearby");
  }

  const now = new Date();
  const minutesLeft = (candidateSession.expiresAt.getTime() - now.getTime()) / 60000;
  if (minutesLeft > 20) {
    score += 15;
    reasons.push("Has time available");
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

export function getTopMatches(
  myUser: User,
  sessions: SessionWithUser[],
  limit = 3
): MatchSuggestion[] {
  const scored = sessions.map((session) => {
    const { score, reasons } = computeCompatibility(myUser, session, session.distanceKm);
    return { session, compatibilityScore: score, reasons };
  });

  return scored
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function blurCoordinates(lat: number, lng: number): { approxLat: number; approxLng: number } {
  const blurMeters = 300 + Math.random() * 200;
  const blurDegrees = blurMeters / 111000;
  const angle = Math.random() * 2 * Math.PI;
  return {
    approxLat: lat + blurDegrees * Math.cos(angle),
    approxLng: lng + blurDegrees * Math.sin(angle),
  };
}

export { haversineKm };
