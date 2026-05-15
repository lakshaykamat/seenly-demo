import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/account/delete:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete account
 *     description: Permanently deletes the current user's account and profile.
 *     responses:
 *       200:
 *         description: Account deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn("Unauthenticated delete attempt", { action: "account.delete.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Delete profile (cascade will handle related data)
  await admin.from("profiles").delete().eq("id", user.id);

  // Delete auth user
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    logger.error("Failed to delete auth user", {
      userId: user.id,
      action: "account.delete.failed",
    });
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  logger.info("Account deleted", { userId: user.id, action: "account.deleted" });
  return NextResponse.json({ ok: true });
}
