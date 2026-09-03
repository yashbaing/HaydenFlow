// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockAsset.sol";
import "../src/AssetRegistry.sol";
import "../src/NexoraPoolFactory.sol";
import "../src/NexoraOracle.sol";
import "../src/NexoraRouter.sol";
import "../src/NexoraPositionManager.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying NEXORA contracts...");
        console.log("Deployer:", deployer);

        // ====== Deploy Mock Assets ======
        MockAsset usdc = new MockAsset("USD Coin", "USDC", 6, "STABLECOIN");
        MockAsset nSPY = new MockAsset("Nexora S&P 500 ETF", "nSPY", 18, "ETF");
        MockAsset nNVDA = new MockAsset("Nexora NVIDIA", "nNVDA", 18, "STOCK");
        MockAsset nTSLA = new MockAsset("Nexora Tesla", "nTSLA", 18, "STOCK");
        MockAsset nAMZN = new MockAsset("Nexora Amazon", "nAMZN", 18, "STOCK");
        MockAsset nCOST = new MockAsset("Nexora Costco", "nCOST", 18, "STOCK");
        MockAsset nQQQ = new MockAsset("Nexora Nasdaq-100 ETF", "nQQQ", 18, "ETF");
        MockAsset nGOLD = new MockAsset("Nexora Gold", "nGOLD", 18, "COMMODITY");
        MockAsset weth = new MockAsset("Wrapped Ether", "WETH", 18, "CRYPTO");
        MockAsset wbtc = new MockAsset("Wrapped Bitcoin", "WBTC", 8, "CRYPTO");

        console.log("USDC:", address(usdc));
        console.log("nSPY:", address(nSPY));
        console.log("nNVDA:", address(nNVDA));
        console.log("nTSLA:", address(nTSLA));
        console.log("nAMZN:", address(nAMZN));
        console.log("nCOST:", address(nCOST));
        console.log("nQQQ:", address(nQQQ));
        console.log("nGOLD:", address(nGOLD));
        console.log("WETH:", address(weth));
        console.log("WBTC:", address(wbtc));

        // ====== Deploy AssetRegistry ======
        AssetRegistry registry = new AssetRegistry();
        console.log("AssetRegistry:", address(registry));

        // Register all assets
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
        registry.registerAsset(
            address(nTSLA), "nTSLA", "Nexora Tesla",
            AssetRegistry.AssetType.STOCK, "Technology/Automotive", address(nSPY), false
        );
        registry.registerAsset(
            address(nAMZN), "nAMZN", "Nexora Amazon",
            AssetRegistry.AssetType.STOCK, "Technology", address(nQQQ), false
        );
        registry.registerAsset(
            address(nCOST), "nCOST", "Nexora Costco",
            AssetRegistry.AssetType.STOCK, "Consumer Staples", address(nSPY), false
        );
        registry.registerAsset(
            address(nQQQ), "nQQQ", "Nexora Nasdaq-100 ETF",
            AssetRegistry.AssetType.ETF, "Technology", address(nSPY), true
        );
        registry.registerAsset(
            address(nGOLD), "nGOLD", "Nexora Gold",
            AssetRegistry.AssetType.COMMODITY, "Commodities", address(usdc), false
        );
        registry.registerAsset(
            address(weth), "WETH", "Wrapped Ether",
            AssetRegistry.AssetType.CRYPTO, "Crypto", address(usdc), true
        );
        registry.registerAsset(
            address(wbtc), "WBTC", "Wrapped Bitcoin",
            AssetRegistry.AssetType.CRYPTO, "Crypto", address(usdc), true
        );

        // ====== Deploy Oracle ======
        NexoraOracle oracle = new NexoraOracle();
        console.log("NexoraOracle:", address(oracle));

        // Set initial prices (8 decimals: price * 1e8)
        oracle.updatePrice(address(usdc),   1_00000000,   10);  // $1.00
        oracle.updatePrice(address(nSPY),   540_00000000, 25);  // $540
        oracle.updatePrice(address(nNVDA),  875_00000000, 50);  // $875
        oracle.updatePrice(address(nTSLA),  215_00000000, 75);  // $215
        oracle.updatePrice(address(nAMZN),  195_00000000, 50);  // $195
        oracle.updatePrice(address(nCOST),  900_00000000, 30);  // $900
        oracle.updatePrice(address(nQQQ),   480_00000000, 25);  // $480
        oracle.updatePrice(address(nGOLD),  2350_00000000, 20); // $2350
        oracle.updatePrice(address(weth),   3250_00000000, 40); // $3250
        oracle.updatePrice(address(wbtc),   68000_00000000, 40); // $68000

        // ====== Deploy PoolFactory ======
        NexoraPoolFactory factory = new NexoraPoolFactory(address(registry));
        console.log("NexoraPoolFactory:", address(factory));

        // Create pools
        // CORRELATED pools (fee: 20bps = 0.2%)
        factory.createPool(address(nNVDA), address(nSPY), NexoraPoolFactory.PoolType.CORRELATED, 20, 8700);
        factory.createPool(address(nTSLA), address(nSPY), NexoraPoolFactory.PoolType.CORRELATED, 20, 7800);
        factory.createPool(address(nAMZN), address(nQQQ), NexoraPoolFactory.PoolType.CORRELATED, 20, 9100);
        factory.createPool(address(nCOST), address(nSPY), NexoraPoolFactory.PoolType.CORRELATED, 20, 7200);
        factory.createPool(address(nQQQ), address(nSPY), NexoraPoolFactory.PoolType.CORRELATED, 15, 9400);

        // BRIDGE pools (fee: 30bps = 0.3%)
        factory.createPool(address(nSPY), address(usdc), NexoraPoolFactory.PoolType.BRIDGE, 30, 0);
        factory.createPool(address(weth), address(usdc), NexoraPoolFactory.PoolType.BRIDGE, 30, 0);
        factory.createPool(address(wbtc), address(usdc), NexoraPoolFactory.PoolType.BRIDGE, 30, 0);

        // ====== Deploy Router ======
        NexoraRouter router = new NexoraRouter(address(factory));
        console.log("NexoraRouter:", address(router));

        // ====== Deploy PositionManager ======
        NexoraPositionManager positionManager = new NexoraPositionManager(address(factory));
        console.log("NexoraPositionManager:", address(positionManager));

        vm.stopBroadcast();

        // Output env vars
        console.log("\n=== Copy these to your .env ===");
        console.log("NEXT_PUBLIC_MOCK_USDC_ADDRESS=", address(usdc));
        console.log("NEXT_PUBLIC_MOCK_NSPY_ADDRESS=", address(nSPY));
        console.log("NEXT_PUBLIC_MOCK_NNVDA_ADDRESS=", address(nNVDA));
        console.log("NEXT_PUBLIC_MOCK_NTSLA_ADDRESS=", address(nTSLA));
        console.log("NEXT_PUBLIC_MOCK_NAMZN_ADDRESS=", address(nAMZN));
        console.log("NEXT_PUBLIC_MOCK_NCOST_ADDRESS=", address(nCOST));
        console.log("NEXT_PUBLIC_MOCK_NQQQ_ADDRESS=", address(nQQQ));
        console.log("NEXT_PUBLIC_MOCK_NGOLD_ADDRESS=", address(nGOLD));
        console.log("NEXT_PUBLIC_MOCK_WETH_ADDRESS=", address(weth));
        console.log("NEXT_PUBLIC_MOCK_WBTC_ADDRESS=", address(wbtc));
        console.log("NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=", address(registry));
        console.log("NEXT_PUBLIC_POOL_FACTORY_ADDRESS=", address(factory));
        console.log("NEXT_PUBLIC_ROUTER_ADDRESS=", address(router));
        console.log("NEXT_PUBLIC_ORACLE_ADDRESS=", address(oracle));
        console.log("NEXT_PUBLIC_POSITION_MANAGER_ADDRESS=", address(positionManager));
    }
}
