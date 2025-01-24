import { z } from 'zod';
import { insertProductSchema } from '@/lib/validators';

export type Product = z.infer<typeof insertProductSchema> & {
    id: number;
    rating: string;
    createdAt: Date;
}