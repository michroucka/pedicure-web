"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = {
    error?: string;
    // Echoed back so a mistyped password doesn't cost retyping the name.
    // Returned, not put in a redirect URL - no username in history or logs.
    username?: string;
};

export async function loginAction(
    _previous: LoginState,
    formData: FormData
): Promise<LoginState> {
    const username = String(formData.get("username") ?? "");
    try {
        await signIn("credentials", {
            username,
            password: formData.get("password"),
            redirectTo: "/kalendar",
        });
    } catch (err) {
        if (err instanceof AuthError) return { error: err.type, username };
        // The success redirect is thrown too - let Next.js handle it.
        throw err;
    }
    return {};
}
