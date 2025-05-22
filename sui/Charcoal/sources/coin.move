module charcoal::my_token {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use std::option;

    /// One time witness for the token
    struct MY_TOKEN has drop {}

    /// Custom token metadata
    struct MyTokenMetadata has key, store {
        id: UID,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
    }

    /// Initialize the token
    fun init(witness: MY_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<MY_TOKEN>(
            witness,
            9, // decimals
            b"CTKN", // symbol
            b"CustomToken", // name
            b"A custom token for arbitrum", // description
            option::none(),
            ctx
        );
        
        // Transfer the treasury capability to the sender (owner)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_freeze_object(metadata);
    }

    /// Mint tokens - only the treasury cap holder can call this
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<MY_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Burn tokens
    public entry fun burn(
        treasury_cap: &mut TreasuryCap<MY_TOKEN>,
        coin: Coin<MY_TOKEN>
    ) {
        coin::burn(treasury_cap, coin);
    }

    /// Get balance of a coin
    public fun balance<T>(coin: &Coin<T>): u64 {
        coin::value(coin)
    }
}
