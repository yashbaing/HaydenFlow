// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockAsset
/// @notice ERC-20 token for testnet simulation of tokenized assets.
///         DISCLAIMER: This token does NOT represent ownership in any real-world security.
///         It is for demonstration and research purposes only.
contract MockAsset is ERC20, Ownable {
    uint8 private immutable _decimals;
    string public assetSymbol;
    string public assetName;
    string public assetType; // "STOCK", "ETF", "CRYPTO", "COMMODITY", "STABLECOIN"

    mapping(address => bool) public minters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    error NotMinter();
    error ZeroAddress();
    error ZeroAmount();

    modifier onlyMinter() {
        if (!minters[msg.sender] && msg.sender != owner()) revert NotMinter();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        string memory assetType_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        assetName = name_;
        assetSymbol = symbol_;
        assetType = assetType_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Mint tokens to a recipient. Only callable by owner or authorized minters.
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Burn tokens from caller's balance.
    function burn(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    /// @notice Burn tokens from an address (requires allowance).
    function burnFrom(address from, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        emit Burned(from, amount);
    }

    /// @notice Faucet function for testnet — mints small amount to caller.
    function faucet(uint256 amount) external {
        require(amount <= 10_000 * (10 ** _decimals), "Faucet: amount too large");
        _mint(msg.sender, amount);
        emit Minted(msg.sender, amount);
    }
}
