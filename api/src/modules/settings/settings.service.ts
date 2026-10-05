import { prisma } from "../../lib/prisma";

export async function getApplicationSettings() {
  const settings = await prisma.applicationSettings.findUnique({ where: { id: "global" } });
  return { approvalEnabled: settings?.approvalEnabled ?? true };
}

export async function updateApplicationSettings(approvalEnabled: boolean) {
  const settings = await prisma.applicationSettings.upsert({
    where: { id: "global" },
    create: { id: "global", approvalEnabled },
    update: { approvalEnabled },
  });
  return { approvalEnabled: settings.approvalEnabled };
}
