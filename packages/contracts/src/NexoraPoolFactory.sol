// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title NexoraPoolFactory
/// @notice Creates and manages correlated-pair liquidity pools for Nexora.
///         Supports CORRELATED, BRIDGE, and STABLE pool types.
contract NexoraPoolFactory is Ownable, ReentrancyGuard {
    enum PoolType {
        CORRELATED,
        BRIDGE,
        STABLE
    }

    struct Pool {
        address token0;
        address token1;
        PoolType poolType;
        uint256 reserve0;
        uint256 reserve1;
        uint256 feeBps; // fee in basis points (e.g., 30 = 0.3%)
        int256 correlationScore; // scaled by 1e4 (e.g., 8700 = 0.87)
        bool active;
        uint256 createdAt;
        uint256 totalLpTokens;
    }

    struct PoolKey {
        address token0;
        address token1;
    }

    // poolId => Pool
    mapping(bytes32 => Pool) public pools;
    // Array of all pool IDs
    bytes32[] public allPoolIds;
    // token pair => poolId (canonical ordering: token0 < token1)
    mapping(address => mapping(address => bytes32)) public getPool;

    // LP token balances: poolId => user => amount
    mapping(bytes32 => mapping(address => uint256)) public lpBalances;

    address public immutable assetRegistry;

    event PoolCreated(
        bytes32 indexed poolId,
        address indexed token0,
        address indexed token1,
        PoolType poolType,
        uint256 feeBps
    );
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 lpMinted
    );
    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 lpBurned
    );
    event Swap(
        bytes32 indexed poolId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event CorrelationUpdated(bytes32 indexed poolId, int256 newCorrelation);

    error PoolAlreadyExists();
    error PoolNotFound();
    error InvalidTokens();
    error InsufficientLiquidity();
    error InsufficientLpTokens();
    error ZeroAmount();
    error PoolInactive();
    error SlippageExceeded();

    constructor(address assetRegistry_) Ownable(msg.sender) {
        assetRegistry = assetRegistry_;
    }

    /// @notice Compute pool ID from two token addresses (canonical order).
    function computePoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(t0, t1));
    }

    /// @notice Create a new liquidity pool.
    function createPool(
        address tokenA,
        address tokenB,
        PoolType poolType,
        uint256 feeBps,
        int256 correlationScore
    ) external onlyOwner returns (bytes32 poolId) {
        if (tokenA == tokenB || tokenA == address(0) || tokenB == address(0)) revert InvalidTokens();

        poolId = computePoolId(tokenA, tokenB);
        if (pools[poolId].createdAt != 0) revert PoolAlreadyExists();

        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        pools[poolId] = Pool({
            token0: t0,
            token1: t1,
            poolType: poolType,
            reserve0: 0,
            reserve1: 0,
            feeBps: feeBps,
            correlationScore: correlationScore,
            active: true,
            createdAt: block.timestamp,
            totalLpTokens: 0
        });

        getPool[t0][t1] = poolId;
        getPool[t1][t0] = poolId;
        allPoolIds.push(poolId);

        emit PoolCreated(poolId, t0, t1, poolType, feeBps);
    }

    /// @notice Add liquidity to a pool.
    function addLiquidity(
        bytes32 poolId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1, uint256 lpMinted) {
        Pool storage pool = pools[poolId];
        if (pool.createdAt == 0) revert PoolNotFound();
        if (!pool.active) revert PoolInactive();

        if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            // Initial liquidity
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            lpMinted = _sqrt(amount0 * amount1);
        } else {
            // Proportional liquidity
            uint256 amount1Optimal = (amount0Desired * pool.reserve1) / pool.reserve0;
            if (amount1Optimal <= amount1Desired) {
                if (amount1Optimal < amount1Min) revert SlippageExceeded();
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = (amount1Desired * pool.reserve0) / pool.reserve1;
                if (amount0Optimal < amount0Min) revert SlippageExceeded();
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }
            lpMinted = _min(
                (amount0 * pool.totalLpTokens) / pool.reserve0,
                (amount1 * pool.totalLpTokens) / pool.reserve1
            );
        }

        if (amount0 == 0 || amount1 == 0 || lpMinted == 0) revert ZeroAmount();

        IERC20(pool.token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(pool.token1).transferFrom(msg.sender, address(this), amount1);

        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLpTokens += lpMinted;
        lpBalances[poolId][to] += lpMinted;

        emit LiquidityAdded(poolId, to, amount0, amount1, lpMinted);
    }

    /// @notice Remove liquidity from a pool.
    function removeLiquidity(
        bytes32 poolId,
        uint256 lpAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        Pool storage pool = pools[poolId];
        if (pool.createdAt == 0) revert PoolNotFound();
        if (lpBalances[poolId][msg.sender] < lpAmount) revert InsufficientLpTokens();

        amount0 = (lpAmount * pool.reserve0) / pool.totalLpTokens;
        amount1 = (lpAmount * pool.reserve1) / pool.totalLpTokens;

        if (amount0 < amount0Min || amount1 < amount1Min) revert SlippageExceeded();
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        lpBalances[poolId][msg.sender] -= lpAmount;
        pool.totalLpTokens -= lpAmount;
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;

        IERC20(pool.token0).transfer(to, amount0);
        IERC20(pool.token1).transfer(to, amount1);

        emit LiquidityRemoved(poolId, to, amount0, amount1, lpAmount);
    }

    /// @notice Execute a swap within a single pool. Called by the Router.
    function swap(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external nonReentrant returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        if (pool.createdAt == 0) revert PoolNotFound();
        if (!pool.active) revert PoolInactive();
        if (amountIn == 0) revert ZeroAmount();

        bool isToken0In = tokenIn == pool.token0;
        address tokenOut = isToken0In ? pool.token1 : pool.token0;
        uint256 reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;

        if (reserveOut == 0) revert InsufficientLiquidity();

        // Apply fee
        uint256 amountInWithFee = amountIn * (10000 - pool.feeBps);
        amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 10000) + amountInWithFee);

        if (amountOut < amountOutMin) revert SlippageExceeded();
        if (amountOut >= reserveOut) revert InsufficientLiquidity();

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(to, amountOut);

        if (isToken0In) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swap(poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Update the correlation score for a pool (called by oracle/admin).
    function updateCorrelation(bytes32 poolId, int256 newCorrelation) external onlyOwner {
        if (pools[poolId].createdAt == 0) revert PoolNotFound();
        pools[poolId].correlationScore = newCorrelation;
        emit CorrelationUpdated(poolId, newCorrelation);
    }

    /// @notice Get pool info.
    function getPoolInfo(bytes32 poolId) external view returns (Pool memory) {
        if (pools[poolId].createdAt == 0) revert PoolNotFound();
        return pools[poolId];
    }

    /// @notice Get all pool IDs.
    function getAllPoolIds() external view returns (bytes32[] memory) {
        return allPoolIds;
    }

    /// @notice Get quote for a swap (read-only, no state change).
    function getAmountOut(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        if (pool.createdAt == 0) revert PoolNotFound();
        bool isToken0In = tokenIn == pool.token0;
        uint256 reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;
        uint256 amountInWithFee = amountIn * (10000 - pool.feeBps);
        amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 10000) + amountInWithFee);
    }

    // ---- Internal helpers ----

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
