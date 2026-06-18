import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  getByMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);
      return ctx.db.transaction.findMany({
        where: {
          userId: ctx.session.user.id,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ingreso", "gasto"]),
        description: z.string().min(1).max(60),
        amount: z.number().positive(),
        category: z.string().min(1),
        date: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction.create({
        data: {
          type: input.type,
          description: input.description,
          amount: input.amount,
          category: input.category,
          date: new Date(input.date + "T12:00:00"),
          userId: ctx.session.user.id,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.db.transaction.findUnique({
        where: { id: input.id },
      });
      if (!tx || tx.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.transaction.delete({ where: { id: input.id } });
    }),
});
