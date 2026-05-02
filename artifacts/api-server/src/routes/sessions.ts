import { Router, type IRouter } from "express";
import { eq, and, gt, ne, sql, inArray } from "drizzle-orm";
import { db, sessionsTable, usersTable, blocksTable } from "@workspace/db";
import { CreateSessionBody, GetNearbySessionsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { blurCoordinates, haversineKm } from "../lib/matching";

const router: IRouter = Router();

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const { lat, lng, placeName, status, mood, durationMinutes } = parsed.data;

  await db.delete(sessionsTable)
    .where(eq(sessionsTable.userId, req.user!.userId));

  const expiresAt = new Date(Date.now() + durationMinutes * 60000);

  const [session] = await db.insert(sessionsTable).values({
    userId: req.user!.userId,
    lat,
    lng,
    placeName: placeName ?? null,
    status,
    mood,
    durationMinutes,
    expiresAt,
  }).returning();

  res.status(201).json({
    id: session.id,
    userId: session.userId,
    lat: session.lat,
    lng: session.lng,
    placeName: session.placeName,
    status: session.status,
    mood: session.mood,
    durationMinutes: session.durationMinutes,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  });
});

router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const [session] = await db.select().from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, req.user!.userId),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);

  res.json({ session: session ?? null });
});

router.get("/sessions/nearby", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetNearbySessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params", message: parsed.error.message });
    return;
  }

  const { lat, lng, radiusKm = 3 } = parsed.data;
  const now = new Date();

  const blocks = await db.select().from(blocksTable)
    .where(eq(blocksTable.blockerId, req.user!.userId));
  const blockedUserIds = blocks.map((b) => b.blockedUserId);

  const reverseBlocks = await db.select().from(blocksTable)
    .where(eq(blocksTable.blockedUserId, req.user!.userId));
  const blockerIds = reverseBlocks.map((b) => b.blockerId);

  const allBlockedIds = [...new Set([...blockedUserIds, ...blockerIds])];

  const activeSessions = await db.select().from(sessionsTable)
    .where(and(
      gt(sessionsTable.expiresAt, now),
      ne(sessionsTable.userId, req.user!.userId)
    ));

  const filteredSessions = activeSessions.filter((s) => {
    if (allBlockedIds.includes(s.userId)) return false;
    const dist = haversineKm(lat, lng, s.lat, s.lng);
    return dist <= radiusKm;
  });

  const sessionUserIds = filteredSessions.map((s) => s.userId);
  if (sessionUserIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await db.select().from(usersTable)
    .where(inArray(usersTable.id, sessionUserIds));

  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = filteredSessions.map((s) => {
    const user = userMap.get(s.userId)!;
    const dist = haversineKm(lat, lng, s.lat, s.lng);
    const { approxLat, approxLng } = blurCoordinates(s.lat, s.lng);
    return {
      id: s.id,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio ?? null,
        interests: user.interests ?? [],
        mood: user.mood ?? null,
        profilePic: user.profilePic ?? null,
      },
      approxLat,
      approxLng,
      placeName: s.placeName ?? null,
      status: s.status,
      mood: s.mood,
      expiresAt: s.expiresAt,
      distanceKm: Math.round(dist * 100) / 100,
    };
  });

  res.json(result);
});

router.delete("/sessions/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const sessionId = parseInt(rawId, 10);

  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db.delete(sessionsTable)
    .where(and(
      eq(sessionsTable.id, sessionId),
      eq(sessionsTable.userId, req.user!.userId)
    ))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ success: true, message: "Session ended" });
});

export default router;
