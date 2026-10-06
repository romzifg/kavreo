import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireRole } from "../../common/middleware/auth";
import { currentUser, paginationSchema, pageMeta, publicUserSelect } from "../../common/utils";
import { badRequest, notFound } from "../../common/errors";
import { notifyUsers } from "../notifications/notification.service";
import type { Prisma } from "../../generated/prisma/client";
const fields = {
  title: z.string().trim().min(3).max(160),
  brief: z.string().trim().min(3).max(5000),
  deadline: z.iso.datetime({
    offset: true
  }).refine(v => new Date(v).getTime() > Date.now(), "Deadline harus di masa depan")
};
const createSchema = z.object({
  ...fields,
  assigneeId: z.string().min(1),
  type: z.enum(["SCRIPT", "IDEA"]),
  platform: z.enum(["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS", "FACEBOOK_REELS", "OTHER"]).default("TIKTOK")
}).strict();
const querySchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "TODO", "IN_PROGRESS", "SUBMITTED", "REVISION", "APPROVED", "OVERDUE", "ALL"]).default("ACTIVE")
});
const include = {
  assignee: {
    select: publicUserSelect
  },
  assigner: {
    select: publicUserSelect
  },
  content: {
    select: {
      id: true,
      type: true,
      platform: true,
      status: true,
      approvedAt: true
    }
  }
} satisfies Prisma.WorkTaskInclude;
function state(task: {
  startedAt: Date | null;
  content: {
    status: string;
  };
}) {
  return task.content.status === "DRAFT" ? task.startedAt ? "IN_PROGRESS" : "TODO" : task.content.status;
}
export const taskRoutes = Router();
taskRoutes.get("/assignees", requireRole("APPROVER"), async (_req, res) => {
  res.json({
    data: await prisma.user.findMany({
      where: {
        role: "USER",
        isActive: true
      },
      select: publicUserSelect,
      orderBy: {
        name: "asc"
      }
    })
  });
});
taskRoutes.get("/", async (req, res) => {
  const user = currentUser(req),
    q = querySchema.parse(req.query);
  const scope: Prisma.WorkTaskWhereInput = user.role === "SUPERADMIN" ? {} : user.role === "APPROVER" ? {
    assignerId: user.id
  } : {
    assigneeId: user.id
  };
  const status: Prisma.WorkTaskWhereInput = q.status === "ACTIVE" ? {
    content: {
      status: {
        not: "APPROVED"
      }
    }
  } : q.status === "OVERDUE" ? {
    deadline: {
      lt: new Date()
    },
    content: {
      status: {
        not: "APPROVED"
      }
    }
  } : q.status === "TODO" || q.status === "IN_PROGRESS" ? {
    content: {
      status: "DRAFT"
    },
    startedAt: q.status === "TODO" ? null : {
      not: null
    }
  } : q.status === "ALL" ? {} : {
    content: {
      status: q.status
    }
  };
  const where = {
    AND: [scope, status]
  };
  const [items, total] = await Promise.all([prisma.workTask.findMany({
    where,
    include,
    orderBy: [{
      deadline: "asc"
    }, {
      id: "asc"
    }],
    skip: (q.page - 1) * q.pageSize,
    take: q.pageSize
  }), prisma.workTask.count({
    where
  })]);
  res.json({
    data: items.map(t => ({
      ...t,
      status: state(t),
      overdue: t.deadline < new Date() && t.content.status !== "APPROVED"
    })),
    meta: pageMeta(total, q.page, q.pageSize)
  });
});
taskRoutes.post("/", requireRole("APPROVER"), async (req, res) => {
  const user = currentUser(req),
    input = createSchema.parse(req.body);
  const task = await prisma.$transaction(async tx => {
    const assignee = await tx.user.findFirst({
      where: {
        id: input.assigneeId,
        role: "USER",
        isActive: true
      }
    });
    if (!assignee) throw badRequest("Pilih user aktif untuk menerima pekerjaan");
    const content = await tx.content.create({
      data: {
        title: input.title,
        type: input.type,
        platform: input.platform,
        authorId: input.assigneeId,
        approvers: {
          create: {
            approverId: user.id
          }
        }
      }
    });
    return tx.workTask.create({
      data: {
        title: input.title,
        brief: input.brief,
        deadline: new Date(input.deadline),
        assigneeId: input.assigneeId,
        assignerId: user.id,
        contentId: content.id
      },
      include
    });
  });
  await notifyUsers([input.assigneeId], {
    title: "Pekerjaan baru untukmu",
    message: `${user.name} menugaskan "${task.title}". Lihat brief dan deadline di daftar pekerjaan.`,
    link: "/tasks"
  });
  res.status(201).json({
    data: {
      ...task,
      status: state(task),
      overdue: false
    }
  });
});
taskRoutes.patch("/:id", requireRole("APPROVER"), async (req, res) => {
  const input = z.object(fields).strict().parse(req.body),
    user = currentUser(req);
  const task = await prisma.workTask.findFirst({
    where: {
      id: String(req.params.id),
      assignerId: user.id
    },
    include
  });
  if (!task) throw notFound("Pekerjaan tidak ditemukan");
  if (task.content.status === "APPROVED") throw badRequest("Pekerjaan sudah selesai");
  const updated = await prisma.workTask.update({
    where: {
      id: task.id
    },
    data: {
      ...input,
      deadline: new Date(input.deadline)
    },
    include
  });
  await notifyUsers([task.assigneeId], {
    title: "Brief atau deadline diperbarui",
    message: `${user.name} memperbarui pekerjaan "${updated.title}".`,
    link: "/tasks"
  });
  res.json({
    data: {
      ...updated,
      status: state(updated),
      overdue: false
    }
  });
});
