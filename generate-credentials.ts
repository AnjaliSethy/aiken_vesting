import { Lucid } from "https://deno.land/x/lucid@0.10.11/mod.ts";

async function generateCredentials() {
  // Initialize Lucid
  const lucid = await Lucid.new(undefined, "Preview");

  // Generate and save owner credentials
  const ownerPrivateKey = lucid.utils.generatePrivateKey();
  await Deno.writeTextFile("owner.sk", ownerPrivateKey);

  const ownerAddress = await lucid
    .selectWalletFromPrivateKey(ownerPrivateKey)
    .wallet.address();
  await Deno.writeTextFile("owner.addr", ownerAddress);

  // Generate and save beneficiary credentials
  const beneficiaryPrivateKey = lucid.utils.generatePrivateKey();
  await Deno.writeTextFile("beneficiary.sk", beneficiaryPrivateKey);

  const beneficiaryAddress = await lucid
    .selectWalletFromPrivateKey(beneficiaryPrivateKey)
    .wallet.address();
  await Deno.writeTextFile("beneficiary.addr", beneficiaryAddress);

  console.log("Credentials generated successfully!");
}

// Run the script
generateCredentials().catch((error) => console.error("Error:", error));
