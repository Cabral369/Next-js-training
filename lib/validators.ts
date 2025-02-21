import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";
import { PAYMENT_METHODS } from "./constants";

const currency = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    "Price must be exact two decimal places"
  );

//schema for inserting products
export const insertProductSchema = z.object({
  name: z.string().min(3, "Name is too short").max(255, "Name is too long"),
  slug: z.string().min(3, "Slug is too short").max(255, "Slug is too long"),
  category: z.string().min(3, "Category must be at least 3 characters long"),
  brand: z.string().min(3, "Brand must be at least 3 characters"),
  description: z.string().min(3, "Brand must be at least 3 characters"),
  stock: z.coerce.number(),
  // images: z.array(z.string()).min(1, "Please upload at least one image"),
  // isFeatured: z.boolean(),
  // banner: z.string().nullable(),
  // price: currency,
});

//schema for updating products
export const updateProductSchema = insertProductSchema.extend({
  id: z.string().min(1, "Id is required"),
});

// Schhema for signing users in
export const signInFormSchema = z.object({
  email: z.string().email("invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

//schema for signing up users
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, "Name is too short").max(100, "Name is too long"),
    email: z.string().email("invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

//cart schemas
export const cartItemSchema = z.object({
  productId: z.string(),
  name: z.string().min(3, "Name is too short").max(255, "Name is too long"),
  slug: z.string().min(3, "Slug is too short").max(255, "Slug is too long"),
  qty: z.number().int().nonnegative("Quantity must be a positive integer"),
  image: z.string().min(3, "Image is too short"),
  price: currency,
});

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(3, "Session cart id is too short"),
  userId: z.string().optional().nullable(),
});

//schema for shipping address
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, "Name is too short").max(255, "Name is too long"),
  streetAddress: z
    .string()
    .min(3, "Street address is too short")
    .max(255, "Street address is too long"),
  city: z.string().min(3, "City is too short").max(255, "City is too long"),
  postalCode: z
    .string()
    .min(3, "Postal code is too short")
    .max(255, "Postal code is too long"),
  country: z
    .string()
    .min(3, "Country is too short")
    .max(255, "Country is too long"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const paymentMethodSchema = z
  .object({
    type: z.string().min(1, "Payment method is required"),
  })
  .refine((data) => PAYMENT_METHODS.includes(data.type), {
    path: ["type"],
    message: "Invalid payment method",
  });

export const insertOrderSchema = z.object({
  userId: z.string().min(1, "User id is required"),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().refine((data) => PAYMENT_METHODS.includes(data), {
    message: "Invalid payment method",
  }),
  shippingAddress: shippingAddressSchema,
});

export const insertOrderItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
});

export const paymentResolveSchema = z.object({
  id: z.string(),
  status: z.string(),
  email_address: z.string(),
  price_paid: z.string(),
});

//schema for updating user profile
export const updateUserProfileSchema = z.object({
  name: z.string().min(3, "Name is too short").max(255, "Name is too long"),
  email: z.string().min(3, "Email is too short").max(255, "Email is too long"),
});
