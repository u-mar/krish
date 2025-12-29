import { z } from 'zod';

// Define the schema for SKUs
const skuSchema = z.object({
  size: z.string().min(1, "Size is required"),
  sku: z.string().min(1, "SKU is required"),
  stockQuantity: z.number().min(0, "Stock quantity must be 0 or greater"),
});

// Define the schema for new variants
const newVariantSchema = z.object({
  color: z.string().min(1, "Color is required"),
  skus: z.array(skuSchema).optional(), // Make SKUs optional
});

// Define the schema for existing variants (with id, createdAt, and updatedAt)
const existingVariantSchema = z.object({
  id: z.string(), // existing variant has an ID
  productId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  color: z.string().min(1, "Color is required"),
});

// Define the product schema
export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  categoryId: z.string().min(1, "Category ID is required").max(255),
  price: z.number().min(0, "Price must be a positive number"),
  description: z.string().optional(),
  // Allow either existing variants (with id, createdAt, etc.) or new variants
  variants: z.array(z.union([existingVariantSchema, newVariantSchema])),
});
