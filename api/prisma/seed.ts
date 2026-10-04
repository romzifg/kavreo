import bcrypt from "bcryptjs";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";

const DEMO_PASSWORD = "Password123!";

async function upsertUser(data: { name: string; email: string; role: "USER" | "APPROVER" | "SUPERADMIN"; password: string }) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name, role: data.role },
    create: { name: data.name, email: data.email, role: data.role, passwordHash },
  });
}

function dateOnly(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function main() {
  const admin = await upsertUser({
    name: env.SEED_ADMIN_NAME,
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    role: "SUPERADMIN",
    password: env.SEED_ADMIN_PASSWORD,
  });
  console.log(`✔ Superadmin: ${admin.email} / ${env.SEED_ADMIN_PASSWORD}`);

  if (!env.SEED_DEMO_DATA) return;

  const approverA = await upsertUser({ name: "Rina Approval", email: "rina@contentplanner.test", role: "APPROVER", password: DEMO_PASSWORD });
  const approverB = await upsertUser({ name: "Bima Approval", email: "bima@contentplanner.test", role: "APPROVER", password: DEMO_PASSWORD });
  const creator = await upsertUser({ name: "Dina Kreator", email: "dina@contentplanner.test", role: "USER", password: DEMO_PASSWORD });
  console.log(`✔ Approval: ${approverA.email}, ${approverB.email} / ${DEMO_PASSWORD}`);
  console.log(`✔ User    : ${creator.email} / ${DEMO_PASSWORD}`);

  const already = await prisma.content.count({ where: { authorId: creator.id } });
  if (already > 0) return;

  const script = await prisma.content.create({
    data: {
      type: "SCRIPT",
      title: "3 Kesalahan Skincare Pemula",
      platform: "TIKTOK",
      category: "Edukasi",
      hook: "Stop! Tiga kebiasaan skincare ini diam-diam merusak kulitmu.",
      body: "1) Cuci muka terlalu sering.\n2) Skip sunscreen saat di dalam ruangan.\n3) Ganti produk tiap minggu.\nSolusi singkat untuk masing-masing kesalahan.",
      cta: "Follow untuk tips skincare tiap hari!",
      tone: "Santai & informatif",
      durationSec: 45,
      hashtags: ["skincare", "tipskulit", "fyp"],
      authorId: creator.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      approvers: { create: [{ approverId: approverA.id }, { approverId: approverB.id }] },
      comments: { create: { authorId: creator.id, action: "SUBMIT", round: 0 } },
    },
  });

  await prisma.content.create({
    data: {
      type: "IDEA",
      title: "Seri 'Rutinitas Pagi Kreator'",
      platform: "INSTAGRAM_REELS",
      category: "Lifestyle",
      description: "Rekam behind-the-scenes rutinitas pagi kreator selama 7 hari, tampilkan tools yang dipakai dan kebiasaan produktif.",
      hashtags: ["kreator", "morningroutine"],
      authorId: creator.id,
      status: "DRAFT",
      approvers: { create: [{ approverId: approverA.id }] },
    },
  });

  await prisma.calendar.create({
    data: {
      title: `Kalender Konten ${new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })}`,
      description: "Rencana konten edukasi & lifestyle selama dua minggu ke depan.",
      startDate: dateOnly(0),
      endDate: dateOnly(13),
      authorId: creator.id,
      status: "DRAFT",
      approvers: { create: [{ approverId: approverA.id }] },
      items: {
        create: [
          { date: dateOnly(1), title: "Posting: 3 Kesalahan Skincare Pemula", platform: "TIKTOK", format: "Video 45 detik", contentId: script.id },
          { date: dateOnly(3), title: "Behind the scenes pemotretan", platform: "INSTAGRAM_REELS", format: "Reels 30 detik" },
          { date: dateOnly(6), title: "Q&A pengikut: rutinitas malam", platform: "YOUTUBE_SHORTS", format: "Shorts 60 detik" },
        ],
      },
    },
  });
  console.log("✔ Data demo dibuat");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
