use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite, Interval}
use cardano/transaction.{OutputReference, Transaction}

// Define the Datum type
pub type Datum {
  lock_until: Int,
  // POSIXTime as Int
  owner: VerificationKeyHash,
  beneficiary: VerificationKeyHash,
}

// Define the Redeemer type (placeholder)
pub type Redeemer {Redeemer}

// Empty since no additional redeemer data is required

// Validator function
validator vesting {
  spend(
    datum: Option<Datum>,
    _redeemer: Redeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    // Log the datum for debugging
    trace @"datum": datum

    // Ensure that we have a valid Datum
    expect Some(Datum { owner, beneficiary, lock_until }) = datum

    // Get the current time (validity range lower bound)
    let current_time = self.validity_range.lower_bound

    // Check if the transaction is signed by the owner
    let must_be_signed_by_owner = list.has(self.extra_signatories, owner)

    // Check if the transaction is signed by the beneficiary
    let must_be_signed_by_beneficiary =
      list.has(self.extra_signatories, beneficiary)

    // Ensure the transaction is submitted after the lock period
    let must_start_after =
      when current_time.bound_type is {
        Finite(tx_earliest_time) -> lock_until <= tx_earliest_time
        _ -> False
      }

    // Combine the conditions
    or {
      must_be_signed_by_owner,
      and {
        must_be_signed_by_beneficiary,
        must_start_after,
      },
    }
  }

  // Handle other use cases (not spending)
  else(_) {
    fail
  }
}
