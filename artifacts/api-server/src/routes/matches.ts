import { Router, type IRouter } from "express";
import { eq, and, gt, ne, inArray } from "drizzle-orm";
import { db, sessionsTable, usersTable, blocksTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { blurCoordinates, haversineKm, getTopMatches } from "../lib/matching";

const router: IRouter = Router();

async function getNearbySessionsWithUsers(
  lat: number,
  lng: number,
  excludeUserId: number,
  radiusKm = 5
) {
  const now = new Date();

  const blocks = await db.select().from(blocksTable)
    .where(eq(blocksTable.blockerId, excludeUserId));
  const blockedIds = blocks.map((b) => b.blockedUserId);

  const reverseBlocks = await db.select().from(blocksTable)
    .where(eq(blocksTable.blockedUserId, excludeUserId));
  const blockerIds = reverseBlocks.map((b) => b.blockerId);
  const allBlocked = [...new Set([...blockedIds, ...blockerIds])];

  const activeSessions = await db.select().from(sessionsTable)
    .where(and(
      gt(sessionsTable.expiresAt, now),
      ne(sessionsTable.userId, excludeUserId)
    ));

  const filtered = activeSessions.filter((s) => {
    if (allBlocked.includes(s.userId)) return false;
    return haversineKm(lat, lng, s.lat, s.lng) <= radiusKm;
  });

  if (filtered.length === 0) return [];

  const userIds = filtered.map((s) => s.userId);
  const users = await db.select().from(usersTable)
    .where(inArray(usersTable.id, userIds));

  const userMap = new Map(users.map((u) => [u.id, u]));

  return filtered.map((s) => {
    const user = userMap.get(s.userId)!;
    const dist = haversineKm(lat, lng, s.lat, s.lng);
    const { approxLat, approxLng } = blurCoordinates(s.lat, s.lng);
    return {
      id: s.id,
      userId: s.userId,
      lat: s.lat,
      lng: s.lng,
      approxLat,
      approxLng,
      placeName: s.placeName ?? null,
      status: s.status,
      mood: s.mood,
      expiresAt: s.expiresAt,
      distanceKm: Math.round(dist * 100) / 100,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio ?? null,
        interests: user.interests ?? [],
        mood: user.mood ?? null,
        profilePic: user.profilePic ?? null,
      },
    };
  });
}

router.get("/matches/suggestions", requireAuth, async (req, res): Promise<void> => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "Invalid coordinates" });
    return;
  }

  const [myUser] = await db.select().from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!myUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const nearbySessions = await getNearbySessionsWithUsers(lat, lng, req.user!.userId);
  const suggestions = getTopMatches(myUser, nearbySessions, 3);

  res.json(suggestions.map((s) => ({
    session: {
      id: s.session.id,
      user: s.session.user,
      approxLat: s.session.approxLat,
      approxLng: s.session.approxLng,
      placeName: s.session.placeName,
      status: s.session.status,
      mood: s.session.mood,
      expiresAt: s.session.expiresAt,
      distanceKm: s.session.distanceKm,
    },
    compatibilityScore: s.compatibilityScore,
    reasons: s.reasons,
  })));
});

router.get("/matches/stats", requireAuth, async (req, res): Promise<void> => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "Invalid coordinates" });
    return;
  }

  const nearbySessions = await getNearbySessionsWithUsers(lat, lng, req.user!.userId);

  const moodBreakdown: Record<string, number> = {};
  let totalDist = 0;

  for (const s of nearbySessions) {
    moodBreakdown[s.mood] = (moodBreakdown[s.mood] ?? 0) + 1;
    totalDist += s.distanceKm;
  }

  res.json({
    totalActive: nearbySessions.length,
    moodBreakdown,
    avgDistanceKm: nearbySessions.length > 0
      ? Math.round((totalDist / nearbySessions.length) * 100) / 100
      : 0,
  });
});

export default router;
