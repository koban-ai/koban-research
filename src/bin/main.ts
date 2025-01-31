import OpenAI from "openai";
import { LLMAnalyzer } from "../llm-analyzer";
import { FileScopeExtractor } from "../scope-extractor";
import { VectorDbProcessor } from "../vector-db-processor";
import dedent from "dedent";

const openai = new OpenAI();

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

    // 1. Extract scope data
    const scopeResult = await FileScopeExtractor.load(peapodsScopeFiles);
    if (!scopeResult.success) {
        console.error("Can't load scope");
        return;
    }
    const scope = scopeResult.return;

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

    for (let i = 0; i < 100; i++) {
        await llmAnalyzer.analv1Scope(
            scope,
            `Peapods-${i}`,
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
        );
    }
};

main().catch(console.error);
