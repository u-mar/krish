import { z } from "zod";

export const transactionSchema = z.object({
  cashAmount: z.number().min(0, { message: "Cash amount must be 0 or positive" }).default(0),
  digitalAmount: z.number().min(0, { message: "Digital amount must be 0 or positive" }).default(0),
  details: z.string().min(1, { message: "Details are required" }),
  tranDate: z.string().optional(),
}).refine((data) => data.cashAmount > 0 || data.digitalAmount > 0, {
  message: "Either cash or digital amount must be greater than 0",
  path: ["cashAmount"],
});
