import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.put("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const { name, bio, interests, mood, profilePic } = parsed.data;
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (interests !== undefined) updates.interests = interests;
  if (mood !== undefined) updates.mood = mood;
  if (profilePic !== undefined) updates.profilePic = profilePic;

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    bio: user.bio ?? null,
    interests: user.interests ?? [],
    mood: user.mood ?? null,
    profilePic: user.profilePic ?? null,
    createdAt: user.createdAt,
  });
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio ?? null,
    interests: user.interests ?? [],
    mood: user.mood ?? null,
    profilePic: user.profilePic ?? null,
  });
});

export default router;
