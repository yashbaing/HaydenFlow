// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AssetRegistry
/// @notice Central registry for all tokenized assets supported by Nexora.
///         Stores on-chain metadata for each asset type.
contract AssetRegistry is Ownable {
    enum AssetType {
        STOCK,
        ETF,
        CRYPTO,
        COMMODITY,
        STABLECOIN
    }

    struct Asset {
        address tokenAddress;
        string symbol;
        string name;
        AssetType assetType;
        string sector;
        address benchmarkAsset; // address(0) if no benchmark
        bool isBridgeAsset;
        bool active;
        uint256 registeredAt;
    }

    // symbol => Asset
    mapping(string => Asset) public assets;
    // tokenAddress => symbol
    mapping(address => string) public addressToSymbol;
    // All registered symbols
    string[] public allSymbols;

    event AssetRegistered(
        string indexed symbol,
        address indexed tokenAddress,
        AssetType assetType
    );
    event AssetUpdated(string indexed symbol, bool active);
    event BenchmarkUpdated(string indexed symbol, address benchmarkAsset);

    error AssetAlreadyRegistered(string symbol);
    error AssetNotFound(string symbol);
    error InvalidAddress();
    error EmptySymbol();

    constructor() Ownable(msg.sender) {}

    /// @notice Register a new asset in the registry.
    function registerAsset(
        address tokenAddress,
        string calldata symbol,
        string calldata name,
        AssetType assetType,
        string calldata sector,
        address benchmarkAsset,
        bool isBridgeAsset
    ) external onlyOwner {
        if (tokenAddress == address(0)) revert InvalidAddress();
        if (bytes(symbol).length == 0) revert EmptySymbol();
        if (assets[symbol].tokenAddress != address(0)) revert AssetAlreadyRegistered(symbol);

        assets[symbol] = Asset({
            tokenAddress: tokenAddress,
            symbol: symbol,
            name: name,
            assetType: assetType,
            sector: sector,
            benchmarkAsset: benchmarkAsset,
            isBridgeAsset: isBridgeAsset,
            active: true,
            registeredAt: block.timestamp
        });

        addressToSymbol[tokenAddress] = symbol;
        allSymbols.push(symbol);

        emit AssetRegistered(symbol, tokenAddress, assetType);
    }

    /// @notice Update asset active status.
    function setAssetActive(string calldata symbol, bool active) external onlyOwner {
        if (assets[symbol].tokenAddress == address(0)) revert AssetNotFound(symbol);
        assets[symbol].active = active;
        emit AssetUpdated(symbol, active);
    }

    /// @notice Update benchmark asset for a registered asset.
    function setBenchmarkAsset(string calldata symbol, address benchmarkAsset) external onlyOwner {
        if (assets[symbol].tokenAddress == address(0)) revert AssetNotFound(symbol);
        assets[symbol].benchmarkAsset = benchmarkAsset;
        emit BenchmarkUpdated(symbol, benchmarkAsset);
    }

    /// @notice Get asset info by symbol.
    function getAsset(string calldata symbol) external view returns (Asset memory) {
        if (assets[symbol].tokenAddress == address(0)) revert AssetNotFound(symbol);
        return assets[symbol];
    }

    /// @notice Get asset info by token address.
    function getAssetByAddress(address tokenAddress) external view returns (Asset memory) {
        string memory symbol = addressToSymbol[tokenAddress];
        if (bytes(symbol).length == 0) revert AssetNotFound(symbol);
        return assets[symbol];
    }

    /// @notice Returns all registered symbols.
    function getAllSymbols() external view returns (string[] memory) {
        return allSymbols;
    }

    /// @notice Returns count of registered assets.
    function assetCount() external view returns (uint256) {
        return allSymbols.length;
    }

    /// @notice Check if asset is registered and active.
    function isActive(string calldata symbol) external view returns (bool) {
        return assets[symbol].active;
    }

    /// @notice Check if an address is a registered token.
    function isRegisteredToken(address tokenAddress) external view returns (bool) {
        return bytes(addressToSymbol[tokenAddress]).length > 0;
    }
}
