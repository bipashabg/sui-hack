module charcoal::contract {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin, TreasuryCap};

    /// Error codes
    const ENotOwner: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const ETokenNotFound: u64 = 3;

    /// Main Arbitrum contract state
    struct ArbitrumState has key {
        id: UID,
        usdc_token_address: address,
        backend_wallet_address: address,
        owner: address,
        // Maps token addresses to their corresponding meme token addresses
        token_mappings: Table<address, address>,
    }

    /// Token creation capability
    struct TokenCreationCap has key, store {
        id: UID,
    }

    /// One-time witness for creating tokens dynamically
    struct DYNAMIC_TOKEN has drop {}

    /// Initialize the Arbitrum contract
    fun init(ctx: &mut TxContext) {
        let arbitrum_state = ArbitrumState {
            id: object::new(ctx),
            usdc_token_address: @0x0, // Set to actual USDC address
            backend_wallet_address: @0x0, // Set to actual backend wallet
            owner: tx_context::sender(ctx),
            token_mappings: table::new(ctx),
        };

        let token_creation_cap = TokenCreationCap {
            id: object::new(ctx),
        };

        transfer::share_object(arbitrum_state);
        transfer::transfer(token_creation_cap, tx_context::sender(ctx));
    }

    /// Create a new token and establish mapping
    public entry fun create_token(
        arbitrum_state: &mut ArbitrumState,
        _cap: &TokenCreationCap,
        actual_token: address,
        _name: vector<u8>,
        _symbol: vector<u8>,
        ctx: &mut TxContext
    ) {
        // In a real implementation, you would create a new coin type here
        // For this example, we'll store the token information
        let token_id = object::new(ctx);
        let token_address = object::uid_to_address(&token_id);
        
        // Store the mapping
        table::add(&mut arbitrum_state.token_mappings, token_address, actual_token);
        
        // In practice, you'd need to create the actual token here
        // This is a simplified version
        object::delete(token_id);
    }

    /// Fulfill a buy order by minting tokens
    public entry fun fulfill_buy<T>(
        arbitrum_state: &ArbitrumState,
        treasury_cap: &mut TreasuryCap<T>,
        user: address,
        amount_to_mint: u64,
        meme_token: address,
        ctx: &mut TxContext
    ) {
        // Verify the caller is authorized (backend wallet)
        assert!(tx_context::sender(ctx) == arbitrum_state.backend_wallet_address, ENotOwner);
        
        // Verify token mapping exists
        assert!(table::contains(&arbitrum_state.token_mappings, meme_token), ETokenNotFound);
        
        // Mint tokens to user
        let coin = coin::mint(treasury_cap, amount_to_mint, ctx);
        transfer::public_transfer(coin, user);
    }

    /// Sell tokens by burning them
    public entry fun sell<T>(
        arbitrum_state: &ArbitrumState,
        treasury_cap: &mut TreasuryCap<T>,
        user_coin: Coin<T>,
        amount_of_tokens: u64,
        meme_token: address,
        ctx: &mut TxContext
    ) {
        // Verify token mapping exists
        assert!(table::contains(&arbitrum_state.token_mappings, meme_token), ETokenNotFound);
        
        // Check if user has sufficient balance
        assert!(coin::value(&user_coin) >= amount_of_tokens, EInsufficientBalance);
        
        // If the coin has more than needed, split it
        if (coin::value(&user_coin) > amount_of_tokens) {
            let coin_to_burn = coin::split(&mut user_coin, amount_of_tokens, ctx);
            coin::burn(treasury_cap, coin_to_burn);
            // Return the remaining coin to user
            transfer::public_transfer(user_coin, tx_context::sender(ctx));
        } else {
            // Burn the entire coin
            coin::burn(treasury_cap, user_coin);
        };
    }

    /// Update USDC token address (owner only)
    public entry fun set_usdc_token_address(
        arbitrum_state: &mut ArbitrumState,
        new_address: address,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == arbitrum_state.owner, ENotOwner);
        arbitrum_state.usdc_token_address = new_address;
    }

    /// Update backend wallet address (owner only)
    public entry fun set_backend_wallet_address(
        arbitrum_state: &mut ArbitrumState,
        new_address: address,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == arbitrum_state.owner, ENotOwner);
        arbitrum_state.backend_wallet_address = new_address;
    }

    /// Get token mapping
    public fun get_token_mapping(
        arbitrum_state: &ArbitrumState,
        token_address: address
    ): address {
        *table::borrow(&arbitrum_state.token_mappings, token_address)
    }

    /// Check if token mapping exists
    public fun token_mapping_exists(
        arbitrum_state: &ArbitrumState,
        token_address: address
    ): bool {
        table::contains(&arbitrum_state.token_mappings, token_address)
    }
}
