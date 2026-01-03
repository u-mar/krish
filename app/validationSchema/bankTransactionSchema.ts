import { z } from "zod";

// Define the schema for BankTransaction
export const bankTransactionSchema = z.object({
  bankAccountId: z.string().nonempty("Bank account ID is required"), // Bank account ID to link to
  accountId: z.string().optional(), // The ID of the associated account (optional)
  acc: z.enum(["cr", "dr"], {
    errorMap: () => ({ message: "Transaction type (acc) must be 'cr' or 'dr'" }),
  }), // Type of transaction: 'cr' (credit) or 'dr' (debit)
  details: z.string().optional(), // Optional details of the transaction
  cashBalance: z.number().optional(), // Optional balance for cash
  digitalBalance: z.number().optional(), // Optional balance for digital
});
