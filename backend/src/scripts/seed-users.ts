import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { UserRole, UserStatus } from '../shared/enums';

const PASSWORD = 'Pass@GED2024';

interface SeedUser {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@ged.gov.ma',
    role: UserRole.ADMIN,
    firstName: 'Admin',
    lastName: 'GED',
  },
  {
    email: 'gestionnaire@ged.gov.ma',
    role: UserRole.DOCUMENT_MANAGER,
    firstName: 'Gestionnaire',
    lastName: 'Documentaire',
  },
  {
    email: 'user@ged.gov.ma',
    role: UserRole.STANDARD_USER,
    firstName: 'Utilisateur',
    lastName: 'Standard',
  },
  {
    email: 'rssi@ged.gov.ma',
    role: UserRole.SECURITY_OFFICER,
    firstName: 'RSSI',
    lastName: 'Sécurité',
  },
];

async function main() {
  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    for (const u of SEED_USERS) {
      const id = uuidv4();
      const email = u.email.toLowerCase();

      const result = await db.query(
        `INSERT INTO users (id, email, password_hash, role, status, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING`,
        [
          id,
          email,
          passwordHash,
          u.role,
          UserStatus.ACTIVE,
          u.firstName,
          u.lastName,
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        // eslint-disable-next-line no-console
        console.log(`✔ Créé: ${email} (${u.role})`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`• Déjà présent: ${email} (${u.role})`);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors du seeding des utilisateurs:', err);
  } finally {
    await db.close();
    process.exit(0);
  }
}

void main();

