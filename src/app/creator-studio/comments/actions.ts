"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getMyChannels } from "@/modules/media/service";

async function assertOwnsComment(userId: string, commentId: string) {
  const channelIds = (await getMyChannels(userId)).map((c) => c.id);
  const comment = await prisma.comment.findFirstOrThrow({ where: { id: commentId, content: { channelId: { in: channelIds } } } });
  return comment;
}

export async function hideCommentAction(formData: FormData) {
  const user = await requireSessionUser();
  const commentId = formData.get("commentId") as string;
  await assertOwnsComment(user.id, commentId);
  await prisma.comment.update({ where: { id: commentId }, data: { isHidden: true } });
  revalidatePath("/creator-studio/comments");
}
