import { randomBytes } from "node:crypto";
import { appendFile, access, readFile } from "node:fs/promises";

const file = ".env.local";
const existing = await access(file).then(async () => readFile(file, "utf8")).catch(() => "");
const missing = [];
const add = (name, value) => {
  const present = new RegExp(`^\\s*${name}\\s*=\\s*\\S+`, "m").test(existing);
  if (!present) missing.push(`${name}=${value}`);
};

add("AUTH_SESSION_SECRET", randomBytes(48).toString("hex"));
add("ASAAS_CREDENTIALS_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
add("SETUP_ADMIN_TOKEN", randomBytes(36).toString("hex"));
add("ASAAS_WEBHOOK_TOKEN", randomBytes(36).toString("hex"));

if (missing.length > 0) {
  await appendFile(file, `${existing.endsWith("\n") || existing.length === 0 ? "" : "\n"}${missing.join("\n")}\n`, "utf8");
  console.log(`Adicionadas ${missing.length} variáveis secretas em ${file}.`);
} else {
  console.log(`As variáveis secretas já existem em ${file}; nada foi alterado.`);
}
