import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.ts";

async function main() {
    const [username, email, password] = process.argv.slice(2);

    if (!username || !email || !password) {
        console.error(
            "Použití: npm run create-admin -- <username> <email> <heslo>"
        );
        process.exit(1);
    }

    const passwordHash = await argon2.hash(password);

    const admin = await prisma.adminUser.upsert({
        where: { username },
        update: { email, passwordHash },
        create: { username, email, passwordHash },
    });

    console.log(`Admin účet připraven: ${admin.username} (${admin.email})`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
