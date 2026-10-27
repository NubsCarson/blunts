import { qualifyDinariSandbox } from "./dinari-qualification.js";

const result = await qualifyDinariSandbox({
  keyId: process.env.DINARI_API_KEY_ID,
  secretKey: process.env.DINARI_API_SECRET_KEY,
});
console.log(JSON.stringify(result));
if (result.status !== "sandbox_reads_verified") process.exitCode = 2;
