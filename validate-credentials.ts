import { Lucid } from "https://deno.land/x/lucid@0.10.11/mod.ts";

async function validateCredentials() {
  const lucid = await Lucid.new(undefined, "Preview");

  // Load owner and beneficiary private keys
  const ownerPrivateKey = await Deno.readTextFile("owner.sk");
  const ownerAddress = await Deno.readTextFile("owner.addr");

  const beneficiaryPrivateKey = await Deno.readTextFile("beneficiary.sk");
  const beneficiaryAddress = await Deno.readTextFile("beneficiary.addr");

  // Validate addresses
  const ownerDerivedAddress = await lucid
    .selectWalletFromPrivateKey(ownerPrivateKey)
    .wallet.address();

  const beneficiaryDerivedAddress = await lucid
    .selectWalletFromPrivateKey(beneficiaryPrivateKey)
    .wallet.address();

  console.log(
    ownerAddress === ownerDerivedAddress
      ? "✅ Owner address is valid."
      : "❌ Owner address is invalid!"
  );

  console.log(
    beneficiaryAddress === beneficiaryDerivedAddress
      ? "✅ Beneficiary address is valid."
      : "❌ Beneficiary address is invalid!"
  );
}

validateCredentials().catch(console.error);
