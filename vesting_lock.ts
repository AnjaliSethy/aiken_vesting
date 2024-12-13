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
    BLOCKFROST_API_KEY,
  ),
  "Preview",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

// Function to read the Plutus script validator
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

const validator = await readValidator();

// Get the public key hashes for owner and beneficiary
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
  await lucid.wallet.address()
).paymentCredential?.hash ?? "";

const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
  await Deno.readTextFile("beneficiary.addr")
).paymentCredential?.hash ?? "";

// Define the Datum type and create the datum object
const Datum = Data.Object({
  lock_until: Data.Integer(),
  owner: Data.Bytes(),
  beneficiary: Data.Bytes(),
}) as const;

type Datum = Data.Static<typeof Datum>;

const datum = Data.to<Datum>(
  {
    lock_until: 1702393200000n, // Dec 12, 2024, 3 PM UTC
    owner: ownerPublicKeyHash,
    beneficiary: beneficiaryPublicKeyHash,
  },
  Datum
);


// Lock function
async function lock(lovelace: number, { into, datum }: { into: SpendingValidator; datum: Datum }): Promise<TxHash> {
  const contractAddress = lucid.utils.validatorToAddress(into);

  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, { inline: datum }, { lovelace })
    .complete();

  const signedTx = await tx.sign().complete();

  return signedTx.submit();
}

// Lock 1 tADA into the contract
const txLock = await lock(1000000, { into: validator, datum });

await lucid.awaitTx(txLock);

console.log(`1 tADA locked into the contract\nTx ID: ${txLock}\nDatum: ${JSON.stringify(datum, null, 2)}`);
