import bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { db, users } from '@tourbnt/db';
import { eq } from 'drizzle-orm';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';
dotenvConfig({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`Environment: ${env}`);
console.log(`Loading env from: ${envFile}`);

const createAdminUser = async () => {
    try {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        const name = process.env.ADMIN_NAME || 'Admin';
        const phone = process.env.ADMIN_PHONE;

        if (!email || !password) {
            console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.');
            console.error('   Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run create-admin');
            process.exit(1);
        }
        if (password.length < 8) {
            console.error('❌ ADMIN_PASSWORD must be at least 8 characters.');
            process.exit(1);
        }

        const [existingByEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingByEmail) {
            const [updated] = await db
                .update(users)
                .set({ role: 'admin', verified: true, password: hashedPassword, name })
                .where(eq(users.id, existingByEmail.id))
                .returning();
            console.log('✅ Existing user promoted to admin and password updated.');
            console.log('Email:', updated.email);
            process.exit(0);
        }

        const [adminUser] = await db
            .insert(users)
            .values({
                name,
                email,
                password: hashedPassword,
                phone,
                role: 'admin',
                verified: true,
            })
            .returning();

        console.log('✅ Admin user created successfully!');
        console.log('Email:', adminUser.email);
        console.log('Please store the password securely — it is not logged here.');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
