// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockAsset.sol";
import "../src/AssetRegistry.sol";
import "../src/NexoraPoolFactory.sol";
import "../src/NexoraOracle.sol";
import "../src/NexoraRouter.sol";

contract NexoraTest is Test {
    MockAsset public usdc;
    MockAsset public nSPY;
    MockAsset public nNVDA;
    AssetRegistry public registry;
    NexoraPoolFactory public factory;
    NexoraOracle public oracle;
    NexoraRouter public router;

    address public owner = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 public nvdaSpyPool;
    bytes32 public spyUsdcPool;

    function setUp() public {
        // Deploy mock assets
        usdc = new MockAsset("USD Coin", "USDC", 6, "STABLECOIN");
        nSPY = new MockAsset("Nexora S&P 500 ETF", "nSPY", 18, "ETF");
        nNVDA = new MockAsset("Nexora NVIDIA", "nNVDA", 18, "STOCK");

        // Deploy registry
        registry = new AssetRegistry();

        // Deploy oracle
        oracle = new NexoraOracle();

        // Deploy factory
        factory = new NexoraPoolFactory(address(registry));

        // Deploy router
        router = new NexoraRouter(address(factory));

        // Register assets
        registry.registerAsset(
            address(usdc), "USDC", "USD Coin",
            AssetRegistry.AssetType.STABLECOIN, "Currency", address(0), true
        );
        registry.registerAsset(
            address(nSPY), "nSPY", "Nexora S&P 500 ETF",
            AssetRegistry.AssetType.ETF, "Broad Market", address(usdc), true
        );
        registry.registerAsset(
            address(nNVDA), "nNVDA", "Nexora NVIDIA",
            AssetRegistry.AssetType.STOCK, "Technology", address(nSPY), false
        );

        // Set oracle prices
        oracle.updatePrice(address(usdc), 1_00000000, 10);
        oracle.updatePrice(address(nSPY), 540_00000000, 25);
        oracle.updatePrice(address(nNVDA), 875_00000000, 50);

        // Create pools
        nvdaSpyPool = factory.createPool(
            address(nNVDA), address(nSPY),
            NexoraPoolFactory.PoolType.CORRELATED, 20, 8700
        );
        spyUsdcPool = factory.createPool(
            address(nSPY), address(usdc),
            NexoraPoolFactory.PoolType.BRIDGE, 30, 0
        );

        // Seed initial liquidity
        _seedLiquidity();
    }

    function _seedLiquidity() internal {
        // Mint tokens to owner for seeding
        uint256 nvdaAmount = 1000 ether; // 1000 nNVDA
        uint256 spyForNvda = 1620 ether; // 1620 nSPY (ratio: 875/540 ≈ 1.62)
        uint256 spyForUsdc = 500 ether;  // 500 nSPY
        uint256 usdcAmount = 270_000 * 1e6; // $270,000 USDC

        nNVDA.mint(owner, nvdaAmount);
        nSPY.mint(owner, spyForNvda + spyForUsdc);
        usdc.mint(owner, usdcAmount);

        nNVDA.approve(address(factory), nvdaAmount);
        nSPY.approve(address(factory), spyForNvda + spyForUsdc);
        usdc.approve(address(factory), usdcAmount);

        // Add liquidity to pools with canonical token ordering
        _addLiquidityOrdered(nvdaSpyPool, address(nNVDA), address(nSPY), nvdaAmount, spyForNvda, owner);
        _addLiquidityOrdered(spyUsdcPool, address(nSPY), address(usdc), spyForUsdc, usdcAmount, owner);
    }

    function _addLiquidityOrdered(
        bytes32 poolId,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address to
    ) internal returns (uint256, uint256, uint256) {
        (uint256 a0, uint256 a1) = tokenA < tokenB
            ? (amountA, amountB)
            : (amountB, amountA);
        return factory.addLiquidity(poolId, a0, a1, 0, 0, to);
    }

    // ====== Asset Registry Tests ======

    function test_AssetRegistration() public view {
        AssetRegistry.Asset memory asset = registry.getAsset("nNVDA");
        assertEq(asset.tokenAddress, address(nNVDA));
        assertEq(asset.symbol, "nNVDA");
        assertEq(uint256(asset.assetType), uint256(AssetRegistry.AssetType.STOCK));
        assertTrue(asset.active);
    }

    function test_AssetRegistrationDuplicate() public {
        vm.expectRevert();
        registry.registerAsset(
            address(nNVDA), "nNVDA", "Duplicate",
            AssetRegistry.AssetType.STOCK, "Tech", address(0), false
        );
    }

    function test_AssetLookupByAddress() public view {
        AssetRegistry.Asset memory asset = registry.getAssetByAddress(address(nSPY));
        assertEq(asset.symbol, "nSPY");
        assertEq(uint256(asset.assetType), uint256(AssetRegistry.AssetType.ETF));
        assertTrue(asset.isBridgeAsset);
    }

    function test_AssetDeactivation() public {
        registry.setAssetActive("nNVDA", false);
        assertFalse(registry.isActive("nNVDA"));
        registry.setAssetActive("nNVDA", true);
        assertTrue(registry.isActive("nNVDA"));
    }

    function test_GetAllSymbols() public view {
        string[] memory symbols = registry.getAllSymbols();
        assertEq(symbols.length, 3);
        assertEq(registry.assetCount(), 3);
    }

    // ====== Pool Factory Tests ======

    function test_PoolCreation() public view {
        NexoraPoolFactory.Pool memory pool = factory.getPoolInfo(nvdaSpyPool);
        assertEq(uint256(pool.poolType), uint256(NexoraPoolFactory.PoolType.CORRELATED));
        assertEq(pool.feeBps, 20);
        assertEq(pool.correlationScore, 8700);
        assertTrue(pool.active);
        assertGt(pool.reserve0, 0);
        assertGt(pool.reserve1, 0);
    }

    function test_PoolDuplicatePrevention() public {
        vm.expectRevert();
        factory.createPool(
            address(nNVDA), address(nSPY),
            NexoraPoolFactory.PoolType.CORRELATED, 20, 8700
        );
    }

    function test_AddLiquidity() public {
        uint256 amount0 = 100 ether;
        uint256 amount1 = 162 ether;
        nNVDA.mint(alice, amount0);
        nSPY.mint(alice, amount1);

        vm.startPrank(alice);
        nNVDA.approve(address(factory), amount0);
        nSPY.approve(address(factory), amount1);
        (,, uint256 lpMinted) = _addLiquidityOrdered(nvdaSpyPool, address(nNVDA), address(nSPY), amount0, amount1, alice);
        vm.stopPrank();

        assertGt(lpMinted, 0);
        assertEq(factory.lpBalances(nvdaSpyPool, alice), lpMinted);
    }

    function test_RemoveLiquidity() public {
        // First add
        uint256 amount0 = 100 ether;
        uint256 amount1 = 162 ether;
        nNVDA.mint(alice, amount0);
        nSPY.mint(alice, amount1);
        vm.startPrank(alice);
        nNVDA.approve(address(factory), amount0);
        nSPY.approve(address(factory), amount1);
        (,, uint256 lpMinted) = _addLiquidityOrdered(nvdaSpyPool, address(nNVDA), address(nSPY), amount0, amount1, alice);

        // Then remove
        factory.removeLiquidity(nvdaSpyPool, lpMinted, 0, 0, alice);
        vm.stopPrank();

        assertEq(factory.lpBalances(nvdaSpyPool, alice), 0);
    }

    // ====== Oracle Tests ======

    function test_OraclePriceUpdate() public {
        oracle.updatePrice(address(nNVDA), 900_00000000, 50);
        (uint256 price, uint256 updatedAt, uint256 confidence) = oracle.getPriceUnsafe(address(nNVDA));
        assertEq(price, 900_00000000);
        assertEq(updatedAt, block.timestamp);
        assertEq(confidence, 50);
    }

    function test_OracleStalePrice() public {
        oracle.updatePrice(address(nNVDA), 875_00000000, 50);
        // Fast forward 25 hours
        vm.warp(block.timestamp + 25 hours);
        vm.expectRevert();
        oracle.getPrice(address(nNVDA));
    }

    function test_OracleBatchUpdate() public {
        address[] memory tokens = new address[](2);
        uint256[] memory prices = new uint256[](2);
        uint256[] memory confidences = new uint256[](2);

        tokens[0] = address(nSPY);
        tokens[1] = address(nNVDA);
        prices[0] = 550_00000000;
        prices[1] = 900_00000000;
        confidences[0] = 20;
        confidences[1] = 40;

        oracle.batchUpdatePrices(tokens, prices, confidences);
        (uint256 p1,,) = oracle.getPriceUnsafe(address(nSPY));
        (uint256 p2,,) = oracle.getPriceUnsafe(address(nNVDA));
        assertEq(p1, 550_00000000);
        assertEq(p2, 900_00000000);
    }

    // ====== Router Tests ======

    function test_DirectSwap() public {
        uint256 amountIn = 10 ether; // 10 nNVDA
        nNVDA.mint(alice, amountIn);

        vm.startPrank(alice);
        nNVDA.approve(address(factory), amountIn);

        uint256 amountOut = factory.getAmountOut(nvdaSpyPool, address(nNVDA), amountIn);
        assertGt(amountOut, 0);

        factory.swap(nvdaSpyPool, address(nNVDA), amountIn, 0, alice);
        vm.stopPrank();

        assertEq(nNVDA.balanceOf(alice), 0);
        assertGt(nSPY.balanceOf(alice), 0);
    }

    function test_MultiHopRoute() public {
        // USDC -> nSPY -> nNVDA
        uint256 amountIn = 1000 * 1e6; // $1000 USDC
        usdc.mint(alice, amountIn);

        address[] memory path = new address[](3);
        path[0] = address(usdc);
        path[1] = address(nSPY);
        path[2] = address(nNVDA);

        vm.startPrank(alice);
        usdc.approve(address(router), amountIn);

        uint256[] memory amounts = router.getAmountsOut(path, amountIn);
        assertEq(amounts.length, 3);
        assertGt(amounts[2], 0);

        router.swapExactTokensForTokens(
            path, amountIn, 0, alice, block.timestamp + 300
        );
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), 0);
        assertGt(nNVDA.balanceOf(alice), 0);
    }

    function test_RouterDeadlineCheck() public {
        uint256 amountIn = 100 * 1e6;
        usdc.mint(alice, amountIn);

        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(nSPY);

        vm.startPrank(alice);
        usdc.approve(address(router), amountIn);
        vm.warp(block.timestamp + 1000);

        vm.expectRevert();
        router.swapExactTokensForTokens(
            path, amountIn, 0, alice, block.timestamp - 1 // expired
        );
        vm.stopPrank();
    }

    function test_RoutingAuthorization() public view {
        address[] memory path = new address[](3);
        path[0] = address(usdc);
        path[1] = address(nSPY);
        path[2] = address(nNVDA);

        assertTrue(router.isValidPath(path));
    }

    // ====== MockAsset Tests ======

    function test_MockAssetFaucet() public {
        vm.prank(alice);
        nNVDA.faucet(100 ether);
        assertEq(nNVDA.balanceOf(alice), 100 ether);
    }

    function test_MockAssetMinterRole() public {
        nNVDA.addMinter(alice);
        vm.prank(alice);
        nNVDA.mint(bob, 50 ether);
        assertEq(nNVDA.balanceOf(bob), 50 ether);
    }

    function test_MockAssetBurn() public {
        nNVDA.mint(alice, 100 ether);
        vm.prank(alice);
        nNVDA.burn(50 ether);
        assertEq(nNVDA.balanceOf(alice), 50 ether);
    }
}
