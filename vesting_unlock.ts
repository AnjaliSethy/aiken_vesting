import {
    Blockfrost,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
  } from "https://deno.land/x/lucid@0.10.11/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.6.0/index.js";
  
  const BLOCKFROST_API_KEY = "previewwummPv83iG6BCnweb8Ze7j2162uvOj1Y";
  
  // Initialize Lucid with Blockfrost and select wallet
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      BLOCKFROST_API_KEY
    ),
    "Preview"
  );
  
  lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./beneficiary.sk"));
  
  // Function to read the Plutus script validator
  async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
      type: "PlutusV2",
      script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
  }
  
  const validator = await readValidator();
  
  // Get the beneficiary public key hash
  const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential?.hash ?? "";
  
  console.log("Beneficiary Public Key Hash:", beneficiaryPublicKeyHash);
  
  // Define the structure of the Datum
  const Datum = {
    lock_until: Data.Integer,
    owner: Data.String,
    beneficiary: Data.String,
  };
  
  // Type for the Datum object
  type Datum = Data.Static<typeof Datum>;
  
  // Current time in POSIX format (in seconds)
  const currentTime = Math.floor(Date.now() / 1000);
  console.log("Current Time:", currentTime);
  
  // Get all UTXOs at the script address
  const scriptAddress = lucid.utils.validatorToAddress(validator);
  const scriptUtxos = await lucid.utxosAt(scriptAddress);
  console.log("Fetched UTXOs:", scriptUtxos);
  
  // Filter UTXOs that can be unlocked
  const utxos = scriptUtxos.filter((utxo) => {
    const datum = Data.from<Datum>(utxo.datum, Datum);
    console.log("Checking UTXO: ", datum);
  
    // Ensure lock_until is being treated as a BigInt
    const lockUntilInMillis = datum.fields[0];
    if (typeof lockUntilInMillis !== "bigint") {
      console.log("Error: lock_until is not a valid BigInt.");
      return false; // Skip invalid UTXOs
    }
  
    // Convert lock_until from milliseconds to seconds
    const lockUntilInSeconds = Number(lockUntilInMillis) / 1000;
    console.log("Lock Until (seconds):", lockUntilInSeconds);
  
    // Check if the UTXO is redeemable
    const isUnlockable =
      datum.beneficiary === beneficiaryPublicKeyHash && lockUntilInSeconds <= currentTime;
  
    if (isUnlockable) {
      console.log(`UTXO is redeemable!`);
    } else {
      console.log(`UTXO is not redeemable yet. Lock time is ${lockUntilInSeconds} seconds.`);
    }
  
    return isUnlockable;
  });
  
  if (utxos.length === 0) {
    console.log("No redeemable UTXO found. Please wait until the lock time has passed.");
    Deno.exit(1);
  }
  
  // Redeemer: Empty for this contract
  const redeemer = Data.empty();
  
  // Unlock function
  async function unlock(
    utxos: any[],
    { from, using }: { from: SpendingValidator; using: unknown }
  ): Promise<TxHash> {
    const laterTime = currentTime + 2 * 60 * 60; // Two hours TTL
  
    const tx = await lucid
      .newTx()
      .collectFrom(utxos, using)
      .addSigner(await lucid.wallet.address()) // Add the beneficiary as signer
      .validFrom(currentTime)
      .validTo(laterTime)
      .attachSpendingValidator(from)
      .complete();
  
    const signedTx = await tx.sign().complete();
  
    return signedTx.submit();
  }
  
  // Unlock the UTXOs
  const txUnlock = await unlock(utxos, { from: validator, using: redeemer });
  
  await lucid.awaitTx(txUnlock);
  
  console.log(`1 tADA unlocked from the contract\nTx ID: ${txUnlock}\nRedeemer: ${redeemer}`);
  