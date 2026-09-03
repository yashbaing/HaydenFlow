// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NexoraPoolFactory.sol";

/// @title NexoraRouter
/// @notice Multi-hop smart router that discovers and executes optimal routes
///         across the Nexora liquidity graph.
///         Supports up to 4 hops per route.
contract NexoraRouter is Ownable, ReentrancyGuard {
    NexoraPoolFactory public immutable factory;

    uint256 public constant MAX_HOPS = 4;
    uint256 public constant DEADLINE_BUFFER = 300; // 5 minutes

    event SwapExecuted(
        address indexed user,
        address[] path,
        uint256 amountIn,
        uint256 amountOut,
        bytes32[] poolIds
    );

    error InvalidPath();
    error DeadlinePassed();
    error InsufficientOutput(uint256 expected, uint256 actual);
    error PathTooLong();
    error EmptyPath();

    constructor(address factory_) Ownable(msg.sender) {
        factory = NexoraPoolFactory(factory_);
    }

    /// @notice Execute a multi-hop swap along a specified path.
    /// @param path Array of token addresses [tokenIn, ..., tokenOut]
    /// @param amountIn Amount of tokenIn to swap
    /// @param amountOutMin Minimum acceptable output amount
    /// @param to Recipient of output tokens
    /// @param deadline Unix timestamp deadline
    function swapExactTokensForTokens(
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256[] memory amounts) {
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (path.length < 2) revert EmptyPath();
        if (path.length > MAX_HOPS + 1) revert PathTooLong();

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        bytes32[] memory poolIds = new bytes32[](path.length - 1);

        // Calculate all output amounts
        for (uint256 i = 0; i < path.length - 1; i++) {
            bytes32 poolId = factory.computePoolId(path[i], path[i + 1]);
            poolIds[i] = poolId;
            amounts[i + 1] = factory.getAmountOut(poolId, path[i], amounts[i]);
        }

        if (amounts[amounts.length - 1] < amountOutMin) {
            revert InsufficientOutput(amountOutMin, amounts[amounts.length - 1]);
        }

        // Execute the swaps
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        for (uint256 i = 0; i < path.length - 1; i++) {
            bytes32 poolId = poolIds[i];
            address recipient = (i == path.length - 2) ? to : address(this);

            IERC20(path[i]).approve(address(factory), amounts[i]);
            factory.swap(poolId, path[i], amounts[i], 0, recipient);
        }

        emit SwapExecuted(msg.sender, path, amountIn, amounts[amounts.length - 1], poolIds);
    }

    /// @notice Get expected output amounts for a multi-hop path (read-only quote).
    /// @param path Array of token addresses
    /// @param amountIn Input amount
    /// @return amounts Array of amounts at each hop
    function getAmountsOut(
        address[] calldata path,
        uint256 amountIn
    ) external view returns (uint256[] memory amounts) {
        if (path.length < 2) revert EmptyPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            bytes32 poolId = factory.computePoolId(path[i], path[i + 1]);
            amounts[i + 1] = factory.getAmountOut(poolId, path[i], amounts[i]);
        }
    }

    /// @notice Get price impact for a route (in basis points).
    function getPriceImpact(
        address[] calldata path,
        uint256 amountIn
    ) external view returns (uint256 impactBps) {
        if (path.length < 2) revert EmptyPath();
        uint256 totalImpact = 0;
        uint256 currentAmount = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            bytes32 poolId = factory.computePoolId(path[i], path[i + 1]);
            NexoraPoolFactory.Pool memory pool = factory.getPoolInfo(poolId);
            bool isToken0In = path[i] == pool.token0;
            uint256 reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
            // Impact approximation: amountIn / (reserveIn + amountIn) in bps
            if (reserveIn > 0) {
                totalImpact += (currentAmount * 10000) / (reserveIn + currentAmount);
            }
            currentAmount = factory.getAmountOut(poolId, path[i], currentAmount);
        }
        impactBps = totalImpact;
    }

    /// @notice Check if a path is valid (all pools exist and are active).
    function isValidPath(address[] calldata path) external view returns (bool) {
        if (path.length < 2 || path.length > MAX_HOPS + 1) return false;
        for (uint256 i = 0; i < path.length - 1; i++) {
            bytes32 poolId = factory.computePoolId(path[i], path[i + 1]);
            NexoraPoolFactory.Pool memory pool = factory.getPoolInfo(poolId);
            if (!pool.active || pool.createdAt == 0) return false;
        }
        return true;
    }
}
