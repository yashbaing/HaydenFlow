// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NexoraPoolFactory.sol";

/// @title NexoraPositionManager
/// @notice Tracks LP positions and fee accumulation for Nexora liquidity providers.
contract NexoraPositionManager is Ownable, ReentrancyGuard {
    NexoraPoolFactory public immutable factory;

    struct Position {
        bytes32 poolId;
        address owner;
        uint256 lpTokens;
        uint256 token0Deposited;
        uint256 token1Deposited;
        uint256 feesEarned0; // accumulated fees in token0
        uint256 feesEarned1; // accumulated fees in token1
        uint256 createdAt;
        uint256 lastUpdatedAt;
    }

    // positionId => Position
    mapping(bytes32 => Position) public positions;
    // user => positionIds
    mapping(address => bytes32[]) public userPositions;
    // poolId => total fee accumulation tracker (scaled by 1e18)
    mapping(bytes32 => uint256) public feeGrowthGlobal0;
    mapping(bytes32 => uint256) public feeGrowthGlobal1;
    // positionId => last fee snapshot
    mapping(bytes32 => uint256) public feeGrowthSnapshot0;
    mapping(bytes32 => uint256) public feeGrowthSnapshot1;

    uint256 private _positionNonce;

    event PositionOpened(
        bytes32 indexed positionId,
        address indexed owner,
        bytes32 indexed poolId,
        uint256 lpTokens
    );
    event PositionClosed(bytes32 indexed positionId, address indexed owner);
    event FeesCollected(
        bytes32 indexed positionId,
        address indexed owner,
        uint256 fees0,
        uint256 fees1
    );
    event FeeGrowthUpdated(bytes32 indexed poolId, uint256 growth0, uint256 growth1);

    error PositionNotFound();
    error NotPositionOwner();
    error NoFeesToCollect();

    constructor(address factory_) Ownable(msg.sender) {
        factory = NexoraPoolFactory(factory_);
    }

    /// @notice Open a new LP position.
    function openPosition(
        bytes32 poolId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (bytes32 positionId, uint256 lpMinted) {
        NexoraPoolFactory.Pool memory pool = factory.getPoolInfo(poolId);

        // Approve factory to spend tokens
        IERC20(pool.token0).transferFrom(msg.sender, address(this), amount0Desired);
        IERC20(pool.token1).transferFrom(msg.sender, address(this), amount1Desired);
        IERC20(pool.token0).approve(address(factory), amount0Desired);
        IERC20(pool.token1).approve(address(factory), amount1Desired);

        uint256 amount0;
        uint256 amount1;
        (amount0, amount1, lpMinted) = factory.addLiquidity(
            poolId,
            amount0Desired,
            amount1Desired,
            amount0Min,
            amount1Min,
            address(this)
        );

        // Refund excess
        if (amount0Desired > amount0) {
            IERC20(pool.token0).transfer(msg.sender, amount0Desired - amount0);
        }
        if (amount1Desired > amount1) {
            IERC20(pool.token1).transfer(msg.sender, amount1Desired - amount1);
        }

        positionId = keccak256(abi.encodePacked(msg.sender, poolId, ++_positionNonce));

        positions[positionId] = Position({
            poolId: poolId,
            owner: msg.sender,
            lpTokens: lpMinted,
            token0Deposited: amount0,
            token1Deposited: amount1,
            feesEarned0: 0,
            feesEarned1: 0,
            createdAt: block.timestamp,
            lastUpdatedAt: block.timestamp
        });

        userPositions[msg.sender].push(positionId);
        feeGrowthSnapshot0[positionId] = feeGrowthGlobal0[poolId];
        feeGrowthSnapshot1[positionId] = feeGrowthGlobal1[poolId];

        emit PositionOpened(positionId, msg.sender, poolId, lpMinted);
    }

    /// @notice Close a position and withdraw liquidity.
    function closePosition(
        bytes32 positionId,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        Position storage pos = positions[positionId];
        if (pos.owner == address(0)) revert PositionNotFound();
        if (pos.owner != msg.sender) revert NotPositionOwner();

        // Collect fees first
        _collectFees(positionId);

        // Remove liquidity
        (amount0, amount1) = factory.removeLiquidity(
            pos.poolId,
            pos.lpTokens,
            amount0Min,
            amount1Min,
            msg.sender
        );

        pos.lpTokens = 0;
        emit PositionClosed(positionId, msg.sender);
    }

    /// @notice Collect accumulated fees for a position.
    function collectFees(bytes32 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        if (pos.owner == address(0)) revert PositionNotFound();
        if (pos.owner != msg.sender) revert NotPositionOwner();
        _collectFees(positionId);
    }

    function _collectFees(bytes32 positionId) internal {
        Position storage pos = positions[positionId];
        bytes32 poolId = pos.poolId;
        NexoraPoolFactory.Pool memory pool = factory.getPoolInfo(poolId);

        uint256 feeDelta0 = feeGrowthGlobal0[poolId] - feeGrowthSnapshot0[positionId];
        uint256 feeDelta1 = feeGrowthGlobal1[poolId] - feeGrowthSnapshot1[positionId];

        uint256 earned0 = (pos.lpTokens * feeDelta0) / 1e18;
        uint256 earned1 = (pos.lpTokens * feeDelta1) / 1e18;

        feeGrowthSnapshot0[positionId] = feeGrowthGlobal0[poolId];
        feeGrowthSnapshot1[positionId] = feeGrowthGlobal1[poolId];

        pos.feesEarned0 += earned0;
        pos.feesEarned1 += earned1;
        pos.lastUpdatedAt = block.timestamp;

        if (earned0 > 0) IERC20(pool.token0).transfer(pos.owner, earned0);
        if (earned1 > 0) IERC20(pool.token1).transfer(pos.owner, earned1);

        emit FeesCollected(positionId, pos.owner, earned0, earned1);
    }

    /// @notice Update fee growth for a pool (called after swaps). Owner only.
    function updateFeeGrowth(
        bytes32 poolId,
        uint256 feeAmount0,
        uint256 feeAmount1,
        uint256 totalLp
    ) external onlyOwner {
        if (totalLp > 0) {
            feeGrowthGlobal0[poolId] += (feeAmount0 * 1e18) / totalLp;
            feeGrowthGlobal1[poolId] += (feeAmount1 * 1e18) / totalLp;
        }
        emit FeeGrowthUpdated(poolId, feeGrowthGlobal0[poolId], feeGrowthGlobal1[poolId]);
    }

    /// @notice Get all positions for a user.
    function getUserPositions(address user) external view returns (bytes32[] memory) {
        return userPositions[user];
    }

    /// @notice Get position details.
    function getPosition(bytes32 positionId) external view returns (Position memory) {
        if (positions[positionId].owner == address(0)) revert PositionNotFound();
        return positions[positionId];
    }
}
