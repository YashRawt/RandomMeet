import { Router, type IRouter } from "express";
import { eq, and, or, inArray } from "drizzle-orm";
import { db, reportsTable, blocksTable, usersTable } from "@workspace/db";
import { ReportUserBody, BlockUserBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/safety/report", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReportUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const { reportedUserId, reason } = parsed.data;

  await db.insert(reportsTable).values({
    reporterId: req.user!.userId,
    reportedUserId,
    reason,
  });

  res.status(201).json({ success: true, message: "Report submitted. Thank you for helping keep I AM HERE safe." });
});

router.post("/safety/block", requireAuth, async (req, res): Promise<void> => {
  const parsed = BlockUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const { blockedUserId } = parsed.data;

  const existing = await db.select().from(blocksTable)
    .where(and(
      eq(blocksTable.blockerId, req.user!.userId),
      eq(blocksTable.blockedUserId, blockedUserId)
    ))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(blocksTable).values({
      blockerId: req.user!.userId,
      blockedUserId,
    });
  }

  res.status(201).json({ success: true, message: "User blocked" });
});

router.get("/safety/blocked", requireAuth, async (req, res): Promise<void> => {
  const blocks = await db.select().from(blocksTable)
    .where(eq(blocksTable.blockerId, req.user!.userId));

  if (blocks.length === 0) {
    res.json([]);
    return;
  }

  const blockedUserIds = blocks.map((b) => b.blockedUserId);
  const users = await db.select().from(usersTable)
    .where(inArray(usersTable.id, blockedUserIds));

  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = blocks.map((b) => {
    const user = userMap.get(b.blockedUserId);
    return {
      id: b.id,
      blockedUserId: b.blockedUserId,
      blockedUser: user ? {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio ?? null,
        interests: user.interests ?? [],
        mood: user.mood ?? null,
        profilePic: user.profilePic ?? null,
      } : null,
      createdAt: b.createdAt,
    };
  });

  res.json(result);
});

export default router;
