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
        const [existingAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('30354380@Atmc', 10); // Change this password!

        const [adminUser] = await db
            .insert(users)
            .values({
                name: 'Admin User',
                email: 'info@tourbnt.com', // Change this email!
                password: hashedPassword,
                phone: '0433926079',
                role: 'admin',
                verified: true,
            })
            .returning();

        console.log('Admin user created successfully!');
        console.log('Email:', adminUser.email);
        console.log('Password: admin123'); // Remember to change this!
        console.log('Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
