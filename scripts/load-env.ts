// Laadt .env.local VÓÓR andere imports. Importeer dit als allereerste regel in
// een CLI-script ("import ./load-env") zodat process.env.DATABASE_URL gezet is
// voordat db/index.ts wordt geëvalueerd (ES-module-imports draaien in volgorde).
import { config } from "dotenv";
config({ path: ".env.local" });
