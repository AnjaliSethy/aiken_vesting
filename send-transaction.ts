import { Lucid, Blockfrost } from "https://deno.land/x/lucid@0.10.11/mod.ts";

const BLOCKFROST_PROJECT_ID = "previewwummPv83iG6BCnweb8Ze7j2162uvOj1Y"; // Replace with your Blockfrost API key

async function sendTransaction() {
  // Initialize Lucid with Blockfrost
  const lucid = await Lucid.new(
    new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", BLOCKFROST_PROJECT_ID),
    "Preview"
  );

  // Debugging: Check protocol parameters
  const protocolParams = await lucid.provider.getProtocolParameters();
  console.log("Protocol Parameters:", protocolParams);

  if (!protocolParams) {
    throw new Error("Unable to retrieve protocol parameters. Check Blockfrost API key and network.");
  }

  // Load owner private key
  const ownerPrivateKey = await Deno.readTextFile("owner.sk");
  const ownerWallet = lucid.selectWalletFromPrivateKey(ownerPrivateKey);

  const beneficiaryAddress = await Deno.readTextFile("beneficiary.addr");

  // Build and sign transaction
  const tx = await lucid
    .newTx()
    .payToAddress(beneficiaryAddress, { lovelace: BigInt(1000000) }) // 1 ADA = 1,000,000 lovelace
    .complete();

  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();

  console.log(`Transaction successfully submitted with hash: ${txHash}`);
}

sendTransaction().catch(console.error);
