import OpenAI from "openai";
import { LLMAnalyzer } from "../llm-analyzer";
import { FileScopeExtractor } from "../scope-extractor";
import { VectorDbProcessor } from "../vector-db-processor";
import dedent from "dedent";

const openai = new OpenAI();

type DvdScope = {
    name: string;
    files: string[];
    description?: string;
    specs?: string;
};

const main = async () => {
    const fraxlendScopeFiles = [
        // Others..
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPair.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairAccessControl.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairAccessControlErrors.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairConstants.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairCore.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairDeployer.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendPairRegistry.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/FraxlendWhitelist.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/LinearInterestRate.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/Timelock2Step.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/VariableInterestRate.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/oracles/dual-oracles/DualOracleChainlinkUniV3.sol",

        // Libraries
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/libraries/SafeERC20.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/libraries/VaultAccount.sol",

        // Interfaces
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IDualOracle.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IERC4626Extended.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IFraxlendPair.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IFraxlendPairRegistry.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IFraxlendWhitelist.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IRateCalculator.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/IRateCalculatorV2.sol",
        "audit-code/2025-01-peapods-finance/fraxlend/src/contracts/interfaces/ISwapper.sol",
    ];

    const peapodsScopeFiles = [
        "audit-code/2025-01-peapods-finance/contracts/contracts/AutoCompoundingPodLp.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/AutoCompoundingPodLpFactory.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/BulkPodYieldProcess.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/DecentralizedIndex.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/ERC20Bridgeable.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/IndexManager.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/IndexUtils.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/LendingAssetVault.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/LendingAssetVaultFactory.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/PEAS.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/PodUnwrapLocker.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/ProtocolFeeRouter.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/ProtocolFees.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/RewardsWhitelist.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/StakingPoolToken.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/TokenRewards.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/V3Locker.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/WeightedIndex.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/WeightedIndexFactory.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/Zapper.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/dex/AerodromeDexAdapter.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/dex/CamelotDexAdapter.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/dex/UniswapDexAdapter.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/flash/BalancerFlashSource.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/flash/FlashSourceBase.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/flash/PodFlashSource.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/flash/UniswapV3FlashSource.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/AerodromeCommands.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/BokkyPooBahsDateTimeLibrary.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/FullMath.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/PoolAddress.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/PoolAddressAlgebra.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/PoolAddressKimMode.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/PoolAddressSlipstream.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/TickMath.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/libraries/VaultAccount.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/lvf/LeverageFactory.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/lvf/LeverageManager.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/lvf/LeverageManagerAccessControl.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/lvf/LeveragePositionCustodian.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/lvf/LeveragePositions.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/aspTKNMinimalOracle.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/aspTKNMinimalOracleFactory.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/ChainlinkSinglePriceOracle.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/DIAOracleV2SinglePriceOracle.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/spTKNMinimalOracle.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/UniswapV3SinglePriceOracle.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/V2ReservesCamelot.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/oracle/V2ReservesUniswap.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/twaputils/V3TwapAerodromeUtilities.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/twaputils/V3TwapCamelotUtilities.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/twaputils/V3TwapKimUtilities.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/twaputils/V3TwapUtilities.sol",

        "audit-code/2025-01-peapods-finance/contracts/contracts/voting/ConversionFactorPTKN.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/voting/ConversionFactorSPTKN.sol",
        "audit-code/2025-01-peapods-finance/contracts/contracts/voting/VotingPool.sol",
    ];

    const dvdFullScopeFiles: DvdScope[] = [
        // 1. Unstoppable
        {
            name: "Unstoppable",
            files: [
                "audit-code/damn-vulnerable-defi/src/unstoppable/UnstoppableVault.sol",
                "audit-code/damn-vulnerable-defi/src/unstoppable/UnstoppableMonitor.sol",
            ],
            description:
                "There's a tokenized vault with a million DVT tokens deposited. It’s offering flash loans for free, until the grace period ends.",
        },
        // 2. Naive receiver
        {
            name: "NaiveReceiver",
            files: [
                "audit-code/damn-vulnerable-defi/src/naive-receiver/NaiveReceiverPool.sol",
                "audit-code/damn-vulnerable-defi/src/naive-receiver/Multicall.sol",
                "audit-code/damn-vulnerable-defi/src/naive-receiver/FlashLoanReceiver.sol",
                "audit-code/damn-vulnerable-defi/src/naive-receiver/BasicForwarder.sol",
            ],
            description:
                "There’s a pool with 1000 WETH in balance offering flash loans. It has a fixed fee of 1 WETH. The pool supports meta-transactions by integrating with a permissionless forwarder contract.",
        },
        // 3. Truster
        {
            name: "Truster",
            files: [
                "audit-code/damn-vulnerable-defi/src/truster/TrusterLenderPool.sol",
            ],
            description:
                "More and more lending pools are offering flashloans. In this case, a new pool has launched that is offering flashloans of DVT tokens for free.",
        },
        // 4. Side Entrance
        {
            name: "SideEntrance",
            files: [
                "audit-code/damn-vulnerable-defi/src/side-entrance/SideEntranceLenderPool.sol",
            ],
            description:
                "A surprisingly simple pool allows anyone to deposit ETH, and withdraw it at any point in time.",
        },
        // 5. The Rewarder
        {
            name: "TheRewarder",
            files: [
                "audit-code/damn-vulnerable-defi/src/the-rewarder/TheRewarderDistributor.sol",
            ],
            description:
                "A contract is distributing rewards of Damn Valuable Tokens and WETH. To claim rewards, users must prove they're included in the chosen set of beneficiaries. Don't worry about gas though. The contract has been optimized and allows claiming multiple tokens in the same transaction.",
        },
        // 6. Selfie
        {
            name: "Selfie",
            files: [
                "audit-code/damn-vulnerable-defi/src/selfie/SimpleGovernance.sol",
                "audit-code/damn-vulnerable-defi/src/selfie/SelfiePool.sol",
                "audit-code/damn-vulnerable-defi/src/selfie/ISimpleGovernance.sol",
            ],
            description:
                "A new lending pool has launched! It’s now offering flash loans of DVT tokens. It even includes a fancy governance mechanism to control it.",
        },
        // 7. Compromised
        {
            name: "Compromised",
            files: [
                "audit-code/damn-vulnerable-defi/src/compromised/TrustfulOracleInitializer.sol",
                "audit-code/damn-vulnerable-defi/src/compromised/TrustfulOracle.sol",
                "audit-code/damn-vulnerable-defi/src/compromised/Exchange.sol",
            ],
        },
        // 8. Puppet
        {
            name: "Puppet",
            files: [
                "audit-code/damn-vulnerable-defi/src/puppet/PuppetPool.sol",
                "audit-code/damn-vulnerable-defi/src/puppet/IUniswapV1Factory.sol",
                "audit-code/damn-vulnerable-defi/src/puppet/IUniswapV1Exchange.sol",
            ],
            description:
                "There’s a lending pool where users can borrow Damn Valuable Tokens (DVTs). To do so, they first need to deposit twice the borrow amount in ETH as collateral. The pool currently has 100000 DVTs in liquidity.",
        },
        // 9. Puppet V2
        {
            name: "PuppetV2",
            files: [
                "audit-code/damn-vulnerable-defi/src/puppet-v2/PuppetV2Pool.sol",
                "audit-code/damn-vulnerable-defi/src/puppet-v2/UniswapV2Library.sol",
            ],
        },
        // 10. Free Rider
        {
            name: "FreeRider",
            files: [
                "audit-code/damn-vulnerable-defi/src/free-rider/FreeRiderRecoveryManager.sol",
                "audit-code/damn-vulnerable-defi/src/free-rider/FreeRiderNFTMarketplace.sol",
            ],
            description:
                "A new marketplace of Damn Valuable NFTs has been released! There’s been an initial mint of 6 NFTs, which are available for sale in the marketplace. Each one at 15 ETH.A new marketplace of Damn Valuable NFTs has been released! There’s been an initial mint of 6 NFTs, which are available for sale in the marketplace. Each one at 15 ETH.",
        },
        // 11. Backdoor
        {
            name: "Backdoor",
            files: [
                "audit-code/damn-vulnerable-defi/src/backdoor/WalletRegistry.sol",
            ],
            description:
                "To incentivize the creation of more secure wallets in their team, someone has deployed a registry of Safe wallets. When someone in the team deploys and registers a wallet, they earn 10 DVT tokens. The registry tightly integrates with the legitimate Safe Proxy Factory. It includes strict safety checks.",
        },
        // 12. Climber
        {
            name: "Climber",
            files: [
                "audit-code/damn-vulnerable-defi/src/climber/ClimberVault.sol",
                "audit-code/damn-vulnerable-defi/src/climber/ClimberTimelockBase.sol",
                "audit-code/damn-vulnerable-defi/src/climber/ClimberTimelock.sol",
                "audit-code/damn-vulnerable-defi/src/climber/ClimberErrors.sol",
                "audit-code/damn-vulnerable-defi/src/climber/ClimberConstants.sol",
            ],
            description:
                "There’s a secure vault contract guarding 10 million DVT tokens. The vault is upgradeable, following the [UUPS pattern](https://eips.ethereum.org/EIPS/eip-1822). The owner of the vault is a timelock contract. It can withdraw a limited amount of tokens every 15 days. On the vault there’s an additional role with powers to sweep all tokens in case of an emergency. On the timelock, only an account with a “Proposer” role can schedule actions that can be executed 1 hour later.",
        },
        // 13. Wallet Mining
        {
            name: "WalletMining",
            files: [
                "audit-code/damn-vulnerable-defi/src/wallet-mining/WalletDeployer.sol",
                "audit-code/damn-vulnerable-defi/src/wallet-mining/TransparentProxy.sol",
                "audit-code/damn-vulnerable-defi/src/wallet-mining/AuthorizerUpgradeable.sol",
                "audit-code/damn-vulnerable-defi/src/wallet-mining/AuthorizerFactory.sol",
            ],
            description:
                "There’s a contract that incentivizes users to deploy Safe wallets, rewarding them with 1 DVT. It integrates with an upgradeable authorization mechanism, only allowing certain deployers (a.k.a. wards) to be paid for specific deployments. The deployer contract only works with a Safe factory and copy set during deployment. It looks like the [Safe singleton factory](https://github.com/safe-global/safe-singleton-factory) is already deployed.",
        },
        // 14. Puppet V3
        {
            name: "PuppetV3",
            files: [
                "audit-code/damn-vulnerable-defi/src/puppet-v3/PuppetV3Pool.sol",
                "audit-code/damn-vulnerable-defi/src/puppet-v3/INonfungiblePositionManager.sol",
            ],
        },
        // 15. ABI Smuggling
        {
            name: "ABISmuggling",
            files: [
                "audit-code/damn-vulnerable-defi/src/abi-smuggling/AuthorizedExecutor.sol",
                "audit-code/damn-vulnerable-defi/src/abi-smuggling/SelfAuthorizedVault.sol",
            ],
            description:
                "There’s a permissioned vault with 1 million DVT tokens deposited. The vault allows withdrawing funds periodically, as well as taking all funds out in case of emergencies. The contract has an embedded generic authorization scheme, only allowing known accounts to execute specific actions.",
        },
        // 16. Shards
        {
            name: "Shards",
            files: [
                "audit-code/damn-vulnerable-defi/src/shards/IShardsNFTMarketplace.sol",
                "audit-code/damn-vulnerable-defi/src/shards/ShardsFeeVault.sol",
                "audit-code/damn-vulnerable-defi/src/shards/ShardsNFTMarketplace.sol",
            ],
            description:
                'The Shards NFT marketplace is a permissionless smart contract enabling holders of Damn Valuable NFTs to sell them at any price (expressed in USDC). These NFTs could be so damn valuable that sellers can offer them in smaller fractions ("shards"). Buyers can buy these shards, represented by an ERC1155 token. The marketplace only pays the seller once the whole NFT is sold. The marketplace charges sellers a 1% fee in Damn Valuable Tokens (DVT). These can be stored in a secure on-chain vault, which in turn integrates with a DVT staking system.',
        },
        // 17. Curvy Puppet
        {
            name: "CurvyPuppet",
            files: [
                "audit-code/damn-vulnerable-defi/src/curvy-puppet/IStableSwap.sol",
                "audit-code/damn-vulnerable-defi/src/curvy-puppet/ICryptoSwapPool.sol",
                "audit-code/damn-vulnerable-defi/src/curvy-puppet/ICryptoSwapFactory.sol",
                "audit-code/damn-vulnerable-defi/src/curvy-puppet/CurvyPuppetOracle.sol",
                "audit-code/damn-vulnerable-defi/src/curvy-puppet/CurvyPuppetLending.sol",
            ],
            description:
                "There's a lending contract where anyone can borrow LP tokens from Curve's stETH/ETH pool. To do so, borrowers must first deposit enough Damn Valuable tokens (DVT) as collateral. If a position's borrowed value grows larger than the collateral's value, anyone can liquidate it by repaying the debt and seizing all collateral. The lending contract integrates with [Permit2](https://github.com/Uniswap/permit2) to securely manage token approvals. It also uses a permissioned price oracle to fetch the current prices of ETH and DVT.",
        },
        // 18. Withdrawal
        {
            name: "Withdrawal",
            files: [
                "audit-code/damn-vulnerable-defi/src/withdrawal/TokenBridge.sol",
                "audit-code/damn-vulnerable-defi/src/withdrawal/L2MessageStore.sol",
                "audit-code/damn-vulnerable-defi/src/withdrawal/L2Handler.sol",
                "audit-code/damn-vulnerable-defi/src/withdrawal/L1Gateway.sol",
                "audit-code/damn-vulnerable-defi/src/withdrawal/L1Forwarder.sol",
            ],
            description:
                "There's a token bridge to withdraw Damn Valuable Tokens from an L2 to L1. It has a million DVT tokens in balance. The L1 side of the bridge allows anyone to finalize withdrawals, as long as the delay period has passed and they present a valid Merkle proof. The proof must correspond with the latest withdrawals' root set by the bridge owner.",
        },
    ];

    // 1. Extract scope data
    /* const scopeResult = await FileScopeExtractor.load(peapodsScopeFiles);
    if (!scopeResult.success) {
        console.error("Can't load scope");
        return;
    }
    const scope = scopeResult.return; */

    /* const targetContractsResult = scope.getContracts([
        // "SafeERC20",
        // "VaultAccountingLibrary",
        "DualOracleChainlinkUniV3",
        "FraxlendPair",
        "FraxlendPairAccessControl",
        "FraxlendPairCore",
        "FraxlendPairDeployer",
        "FraxlendPairRegistry",
        "FraxlendWhitelist",
        "LinearInterestRate",
        "Timelock2Step",
        "VariableInterestRate",
    ]);
    if (!targetContractsResult.success) {
        console.error("Can't find some of scope contracts..");
        return;
    }
    const targetContracts = targetContractsResult.return; */

    /* for (const mod of targetContract.modifiers) {
        console.log(`${mod.name}`);
        console.log(`|EV\t${mod.emittedEvents}`);
        console.log(`|IC\t${mod.internalCalls}`);
        console.log(`|EC\t${mod.externalCalls}`);
    } */
    /* for (const func of targetContract.functions) {
        console.log(`${func.name}`);
        console.log(`|MO\t${func.usedModifiers}`);
        console.log(`|EV\t${func.emittedEvents}`);
        console.log(`|IC\t${func.internalCalls}`);
        console.log(`|EC\t${func.externalCalls}`);
        console.log(`|UC\t${func.usingCalls}`);
    } */

    // 2. Prepare embeddings from metadata and upload to vector db
    const vectorDb = new VectorDbProcessor(openai);

    // TODO: 3. Start LLM scope analysis
    const llmAnalyzer = new LLMAnalyzer(openai, vectorDb);

    for (const dvdScope of dvdFullScopeFiles) {
        console.log(`[?] Loading.. ${dvdScope.name}`);

        const scopeResult = await FileScopeExtractor.load(dvdScope.files);
        if (!scopeResult.success) {
            console.error("Can't load scope");
            return;
        }
        const scope = scopeResult.return;

        console.log(`[?] Starting analysis of ${dvdScope.name}`);

        await llmAnalyzer.analv1Scope(
            scope,
            dvdScope.name,
            dvdScope.specs,
            dvdScope.description
        );
    }

    /* await llmAnalyzer.analv1Scope(
        scope,
        `Peapods-${0}`,
        dedent`
                Q: Are there any limitations on values set by admins (or other roles) in the codebase, including restrictions on array lengths?
                A: For all access-controlled functions we have validations on restricting values at the beginning of the setters, so refer to those.
    
                Q: Are there any limitations on values set by admins (or other roles) in protocols you integrate with, including restrictions on array lengths?
                A: No
    
                Q: Is the codebase expected to comply with any specific EIPs?
                A: Many of our contracts implement ERC20 and ERC4626 which we attempt to comply with in the entirety of those standards for contracts that implement them.
    
                Q: Are there any off-chain mechanisms involved in the protocol (e.g., keeper bots, arbitrage bots, etc.)? We assume these mechanisms will not misbehave, delay, or go offline unless otherwise specified.
                A: Our protocol and its value proposition assumes the existence of arbitrage bots across markets. We have some partners we work with for them to implement their arbitrage bots to keep market prices across assets in sync (and drive the protocol flywheel ultimately). We will also have liquidations for our fraxlend fork implementation, which can be executed by either bots we create or third parties (liquidations are not restricted to anyone in particular).
    
                Q: What properties/invariants do you want to hold even if breaking them has a low/unknown impact?
                A: For all vaults (ERC4626) we have in the system, the best case scenario is the collateral backing ratio (CBR, i.e. ratio of convertToAssets(shares) / shares) of the vault will always increase and never decrease. the scenario where this isn't necessarily the case is if bad debt is accrued on a lending pair. Otherwise outside of the case of bad debt we expect this CBR to only go upwards over time.
    
                Q: Please discuss any design choices you made.
                A: The main consideration for a design choice we made is in a few places we implement unlimited (100%) slippage for dex swaps. Our expectation is wherever we implement this behavior that almost any swap from token0 to token1 will be of small enough value that it would rarely, if ever, be profitable to sandwich for profit by a bot.
    
                Additional audit information:
                Our codebases have a lot of intertwined protocols and integrations, however the most critical are going to be ensuring
                WeightedIndex.sol, which is our core pod contract, is very secure as it will custody the most funds in the protocol
                StakingPoolToken.sol and AutoCompoundingPodLp.sol also custody a lot of funds so ensuring there are no exploit vectors is critical
                LeverageManager.sol contains the entry points addLeverage and removeLeverage where users will lever up and down their podded tokens and ultimately interact with the fraxlend fork to borrow funds among other things. There is a lot of underlying and somewhat complicated logic here but we want to make sure these two entry points are very secure and no vectors exist to drain funds.
            `,
        dedent`
                Peapods has pioneered trustless and permissionless real yield generation by farming crypto market's only constant, volatility. We are expanding this concept by building leveraged volatility farming (LVF), where farmers and suppliers maximize real yield on their capital with improved capital efficiency and minimizing risk through soft leverage.
            `
    ); */
};

main().catch(console.error);
