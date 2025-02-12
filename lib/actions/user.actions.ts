'use server';

import { signInFormSchema } from "@/lib/validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signUpFormSchema } from "@/lib/validators";
import { hashSync } from "bcrypt-ts-edge";
import { prisma } from "@/db/prisma";
import { formatErrorMessages } from "../utils";

export async function signInWwithCredentials(prevState: unknown, formData: FormData){
    try {
        const user = signInFormSchema.parse({
            email: formData.get('email'),
            password: formData.get('password')
        })

        await signIn('credentials', user);

        return { success: true, message: 'Sign in success' }
    } catch (error) {

        if (isRedirectError(error)){
            throw error;
        }        

        return { success: false, message: 'Invalid email or password' }
    }
}

//sign user out
export async function signOutUser(){
    await signOut();
}

//sign up user
export async function signUpUser(prevState: unknown, formData: FormData){
    try {
        const user = signUpFormSchema.parse({
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        })

        const plainPassword = user.password;

        user.password = hashSync(user.password, 10);

        await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                password: user.password
            }
        })

        await signIn('credentials',{
            email: user.email,
            password: plainPassword, 
        });

        return { success: true, message: 'Sign up success' }

    } catch (error) {
        if (isRedirectError(error)){
            throw error;
        }        

        return { success: false, message: formatErrorMessages(error) }
    }
}

//get user by id
export async function getUserById(userId: string){
    const user = await prisma.user.findUnique({
        where: {id: userId}
    })

    if(!user) throw new Error('User not found');

    return user;
}