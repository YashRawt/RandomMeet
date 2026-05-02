import { Router, type IRouter } from "express";
import { eq, and, or, gt } from "drizzle-orm";
import { db, pingsTable, usersTable, sessionsTable } from "@workspace/db";
import { SendPingBody, RespondToPingBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { rateLimit } from "express-rate-limit";

const pingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: "Too Many Requests", message: "Too many pings. Please wait before sending more." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const router: IRouter = Router();

function formatUser(user: { id: number; name: string; username: string; bio: string | null; interests: string[]; mood: string | null; profilePic: string | null }) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio ?? null,
    interests: user.interests ?? [],
    mood: user.mood ?? null,
    profilePic: user.profilePic ?? null,
  };
}

function formatPing(ping: any, sender?: any, receiver?: any) {
  return {
    id: ping.id,
    senderId: ping.senderId,
    receiverId: ping.receiverId,
    senderSessionId: ping.senderSessionId ?? null,
    receiverSessionId: ping.receiverSessionId ?? null,
    status: ping.status,
    message: ping.message ?? null,
    createdAt: ping.createdAt,
    sender: sender ? formatUser(sender) : null,
    receiver: receiver ? formatUser(receiver) : null,
    revealedLat: ping.revealedLat ?? null,
    revealedLng: ping.revealedLng ?? null,
  };
}

router.post("/pings", requireAuth, pingLimiter, async (req, res): Promise<void> => {
  const parsed = SendPingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const { receiverId, message } = parsed.data;
  const senderId = req.user!.userId;

  if (receiverId === senderId) {
    res.status(400).json({ error: "Cannot ping yourself" });
    return;
  }

  const existingPending = await db.select().from(pingsTable)
    .where(and(
      eq(pingsTable.senderId, senderId),
      eq(pingsTable.receiverId, receiverId),
      eq(pingsTable.status, "pending")
    ))
    .limit(1);

  if (existingPending.length > 0) {
    res.status(409).json({ error: "Conflict", message: "You already have a pending ping to this user" });
    return;
  }

  const [senderSession] = await db.select().from(sessionsTable)
    .where(and(eq(sessionsTable.userId, senderId), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  const [receiverSession] = await db.select().from(sessionsTable)
    .where(and(eq(sessionsTable.userId, receiverId), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  const [ping] = await db.insert(pingsTable).values({
    senderId,
    receiverId,
    senderSessionId: senderSession?.id ?? null,
    receiverSessionId: receiverSession?.id ?? null,
    status: "pending",
    message: message ?? null,
  }).returning();

  res.status(201).json(formatPing(ping));
});

router.get("/pings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const allPings = await db.select().from(pingsTable)
    .where(or(
      eq(pingsTable.senderId, userId),
      eq(pingsTable.receiverId, userId)
    ))
    .orderBy(pingsTable.createdAt);

  const userIds = [...new Set(allPings.flatMap((p) => [p.senderId, p.receiverId]))];

  const users = userIds.length > 0
    ? await db.select().from(usersTable)
        .where(or(...userIds.map((id) => eq(usersTable.id, id))))
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const received = allPings
    .filter((p) => p.receiverId === userId)
    .map((p) => formatPing(p, userMap.get(p.senderId), userMap.get(p.receiverId)));

  const sent = allPings
    .filter((p) => p.senderId === userId)
    .map((p) => formatPing(p, userMap.get(p.senderId), userMap.get(p.receiverId)));

  res.json({ received, sent });
});

router.post("/pings/:pingId/respond", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.pingId) ? req.params.pingId[0] : req.params.pingId;
  const pingId = parseInt(rawId, 10);

  if (isNaN(pingId)) {
    res.status(400).json({ error: "Invalid ping ID" });
    return;
  }

  const parsed = RespondToPingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const { action } = parsed.data;

  const [existing] = await db.select().from(pingsTable)
    .where(and(eq(pingsTable.id, pingId), eq(pingsTable.receiverId, req.user!.userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Ping not found" });
    return;
  }

  const updates: Record<string, unknown> = {
    status: action === "accept" ? "accepted" : "rejected",
  };

  if (action === "accept") {
    const [receiverSession] = await db.select().from(sessionsTable)
      .where(and(eq(sessionsTable.userId, req.user!.userId), gt(sessionsTable.expiresAt, new Date())))
      .limit(1);

    if (receiverSession) {
      updates.revealedLat = receiverSession.lat;
      updates.revealedLng = receiverSession.lng;
    }
  }

  const [updated] = await db.update(pingsTable)
    .set(updates)
    .where(eq(pingsTable.id, pingId))
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, updated.senderId)).limit(1);
  const [receiver] = await db.select().from(usersTable).where(eq(usersTable.id, updated.receiverId)).limit(1);

  res.json(formatPing(updated, sender, receiver));
});

export default router;
