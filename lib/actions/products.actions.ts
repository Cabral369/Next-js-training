'use server';

import { prisma } from "@/db/prisma";
import { convertToPlanObject } from "../utils";
import { LATEST_PRODUCTS_LIMIT } from "../constants";


//get latest products
export async function getLatestProducts() {
    const data = await prisma.product.findMany({
        take:LATEST_PRODUCTS_LIMIT,
        orderBy: {
            createdAt: 'desc'
        }
    })
    
    return convertToPlanObject(data); //precisamos converter o objeto prisma para um objeto plano
}

//get single products by slug
export async function getProductBySlug(slug: string){
    return await prisma.product.findFirst({
        where:{
            slug:slug
        }
    })
}