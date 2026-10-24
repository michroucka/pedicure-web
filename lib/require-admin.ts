import "server-only";
import { auth } from "@/auth.ts";
import { redirect } from "next/navigation";

// First line of every admin server action. proxy.ts isn't enough on its
// own: it guards admin *paths*, but a server action is a public POST
// endpoint identified by the Next-Action header and can be invoked
// against any path (even "/" on the main domain), so the action has to
// check the session itself. auth() runs the jwt callback, so a deleted
// account or changed password is rejected here too. Redirects instead of
// returning an error so it works the same for every action regardless of
// its return type (the session expired – login is the right place anyway).
// Returns the username, already narrowed to string.
export async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.name) {
        redirect("/login");
    }

    return session.user.name;
}
