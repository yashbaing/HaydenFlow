// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NexoraOracle
/// @notice Mock price oracle for testnet simulation.
///         Stores simulated prices for all registered assets.
///         In production, this would integrate with Chainlink or Pyth Network.
contract NexoraOracle is Ownable {
    struct PriceData {
        uint256 price; // Price in USDC with 8 decimal places (e.g., 45000_00000000 = $45,000)
        uint256 updatedAt;
        uint256 confidence; // Confidence interval in bps (e.g., 50 = 0.5%)
        bool valid;
    }

    // token address => PriceData
    mapping(address => PriceData) public prices;
    // authorized updaters (oracles, keepers)
    mapping(address => bool) public updaters;

    event PriceUpdated(address indexed token, uint256 price, uint256 confidence);
    event UpdaterAdded(address indexed updater);
    event UpdaterRemoved(address indexed updater);

    error PriceStale(address token, uint256 updatedAt);
    error PriceNotFound(address token);
    error NotUpdater();
    error InvalidPrice();

    uint256 public constant STALENESS_THRESHOLD = 24 hours;
    uint256 public constant PRICE_DECIMALS = 8;

    modifier onlyUpdater() {
        if (!updaters[msg.sender] && msg.sender != owner()) revert NotUpdater();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function addUpdater(address updater) external onlyOwner {
        updaters[updater] = true;
        emit UpdaterAdded(updater);
    }

    function removeUpdater(address updater) external onlyOwner {
        updaters[updater] = false;
        emit UpdaterRemoved(updater);
    }

    /// @notice Update the price for a token.
    /// @param token Token address
    /// @param price Price in 8 decimal fixed point (e.g., 45000_00000000 for $45,000)
    /// @param confidence Confidence in basis points
    function updatePrice(
        address token,
        uint256 price,
        uint256 confidence
    ) external onlyUpdater {
        if (token == address(0)) revert PriceNotFound(token);
        if (price == 0) revert InvalidPrice();
        prices[token] = PriceData({
            price: price,
            updatedAt: block.timestamp,
            confidence: confidence,
            valid: true
        });
        emit PriceUpdated(token, price, confidence);
    }

    /// @notice Batch update prices.
    function batchUpdatePrices(
        address[] calldata tokens,
        uint256[] calldata priceData,
        uint256[] calldata confidences
    ) external onlyUpdater {
        require(tokens.length == priceData.length && priceData.length == confidences.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[tokens[i]] = PriceData({
                price: priceData[i],
                updatedAt: block.timestamp,
                confidence: confidences[i],
                valid: true
            });
            emit PriceUpdated(tokens[i], priceData[i], confidences[i]);
        }
    }

    /// @notice Get the latest price for a token.
    /// @return price Price in 8 decimals
    /// @return updatedAt Timestamp of last update
    /// @return confidence Confidence in bps
    function getPrice(address token)
        external
        view
        returns (uint256 price, uint256 updatedAt, uint256 confidence)
    {
        PriceData memory data = prices[token];
        if (!data.valid) revert PriceNotFound(token);
        if (block.timestamp - data.updatedAt > STALENESS_THRESHOLD) {
            revert PriceStale(token, data.updatedAt);
        }
        return (data.price, data.updatedAt, data.confidence);
    }

    /// @notice Get price without staleness check (for local testing).
    function getPriceUnsafe(address token)
        external
        view
        returns (uint256 price, uint256 updatedAt, uint256 confidence)
    {
        PriceData memory data = prices[token];
        if (!data.valid) revert PriceNotFound(token);
        return (data.price, data.updatedAt, data.confidence);
    }

    /// @notice Convert price to USD value for a given amount.
    /// @param token Token address
    /// @param amount Amount in token's native decimals
    /// @param tokenDecimals Token's decimal places
    /// @return usdValue USD value with 6 decimal places (USDC-like)
    function getUSDValue(
        address token,
        uint256 amount,
        uint8 tokenDecimals
    ) external view returns (uint256 usdValue) {
        PriceData memory data = prices[token];
        if (!data.valid) revert PriceNotFound(token);
        // price has 8 decimals, amount has tokenDecimals, output has 6 decimals
        usdValue = (amount * data.price) / (10 ** (tokenDecimals + 8 - 6));
    }
}
