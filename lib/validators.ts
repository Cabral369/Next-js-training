import {z} from 'zod';
import { formatNumberWithDecimal } from './utils';

const currency = z.string().refine((value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
'Price must be exact two decimal places');

//schema for inserting products
export const insertProductSchema = z.object({
    name: z.string().min(3, 'Name is too short').max(255, 'Name is too long'),
    slug: z.string().min(3, 'Slug is too short').max(255, 'Slug is too long'),
    category: z.string().min(3, 'Category must be at least 3 characters long'),
    brand: z.string().min(3, 'Brand must be at least 3 characters'),
    description: z.string().min(3, 'Brand must be at least 3 characters'),
    stock:z.coerce.number(),
    images: z.array(z.string()).min(1, 'Please upload at least one image'),
    isFeatured: z.boolean(),
    banner: z.string().nullable(),
    price: currency,
});

// Schhema for signing users in
export const signInFormSchema = z.object({
    email: z.string().email('invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
})