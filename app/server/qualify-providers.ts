import { qualifyDinariSandbox } from "./dinari-qualification.js";
import { qualifyMoonPaySandbox } from "./moonpay-sandbox.js";

const [result, moonpay] = await Promise.all([
  qualifyDinariSandbox({
    keyId: process.env.DINARI_API_KEY_ID,
    secretKey: process.env.DINARI_API_SECRET_KEY,
  }),
  qualifyMoonPaySandbox(),
]);
console.log(JSON.stringify({ dinari: result, moonpay }));
if (
  result.status !== "sandbox_reads_verified" ||
  moonpay.status !== "sandbox_quote_verified"
)
  process.exitCode = 2;
