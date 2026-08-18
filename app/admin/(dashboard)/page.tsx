import { auth, signOut } from "@/auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { LogOut } from "lucide-react";

export default async function AdminHomePage() {
    const session = await auth();

    return (
        <div className="p-6">
            <h1 className="mb-4 text-xl font-semibold">
                Ahoj, {session?.user?.name}
            </h1>
            <form
                action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/admin/login" });
                }}
            >
                <Button
                    type="submit"
                    variant="outline"
                >
                    <LogOut className="size-4" />
                    Odhlásit se
                </Button>
            </form>
        </div>
    );
}
