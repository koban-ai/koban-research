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

    const ecoProtocolScopeFiles = [
        // Token
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/token/TokenInitial.sol",
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/token/L2ECO.sol",
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/token/ERC20Upgradeable.sol",

        // Bridge
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/bridge/CrossDomainEnabledUpgradeable.sol",
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/bridge/InitialBridge.sol",
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/bridge/L1ECOBridge.sol",
        "audit-code/2023-05-ecoprotocol/op-eco/contracts/bridge/L2ECOBridge.sol",
    ];

    // 1. Extract scope data
    const scopeResult = await FileScopeExtractor.load(ecoProtocolScopeFiles);
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

    /* for (const dvdScope of dvdFullScopeFiles) {
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
    } */

    await llmAnalyzer.analv1Backtrack(
        scope,
        "eco",
        dedent`
            # Stale inflationMultiplier in L1ECOBridge

            ## Severity:
            - High

            ## Summary:
            L1ECOBridge::inflationMultiplier is updated through L1ECOBridge::rebase on Ethereum, and it is used in _initiateERC20Deposit and finalizeERC20Withdrawal to convert between token amount and _gonsAmount. However, if rebase is not called in a timely manner, the inflationMultiplier value can be stale and inconsistent with the value of L1 ECO token during transfer, leading to incorrect token amounts in deposit and withdraw.

            ## Vulnerability Detail:
            The inflationMultiplier value is updated in rebase with an independent transaction on L1 as shown below:
            \`\`\`solidity
            function rebase(uint32 _l2Gas) external {
                inflationMultiplier = IECO(l1Eco).getPastLinearInflation(block.number);
            \`\`\`
            However, in both _initiateERC20Deposit, transferFrom is called before the inflationMultiplier is used, which can lead to inconsistent results if rebase is not called on time for the inflationMultiplier to be updated. The code snippet for _initiateERC20Deposit is as follows:
            \`\`\`solidity
                IECO(_l1Token).transferFrom(_from, address(this), _amount);
                _amount = _amount * inflationMultiplier;
            \`\`\`
            finalizeERC20Withdrawal has the same problem.
            \`\`\`solidity
                uint256 _amount = _gonsAmount / inflationMultiplier;
                bytes memory _ecoTransferMessage = abi.encodeWithSelector(IERC20.transfer.selector,_to,_amount);
            \`\`\`
            The same problem does not exist in L2ECOBridge. Because the L2 rebase function updates inflationMultiplier and rebase l2Eco token synchronously.
            \`\`\`solidity
                function rebase(uint256 _inflationMultiplier)
                external
                virtual
                onlyFromCrossDomainAccount(l1TokenBridge)
                validRebaseMultiplier(_inflationMultiplier)
            {
                inflationMultiplier = _inflationMultiplier;
                l2Eco.rebase(_inflationMultiplier);
                emit RebaseInitiated(_inflationMultiplier);
            }
            \`\`\`

            ## Impact:
            The attacker can steal tokens with this.
            
            He can deposit to L1 bridge when he observes a stale larger value and he will receive more tokens on L2.

            ## Recommendation:
            Calling IECO(l1Eco).getPastLinearInflation(block.number) instead of using inflationMultiplier.
        `,
        100,
        ["o1-preview", "chatgpt-4o-latest"],
        undefined,
        dedent`
            Eco enables any onchain action to be a simple, one-click stablesend. With Eco, apps can easily accept anyone’s preferred stablecoin, regardless of the network — unlocking stablecoin liquidity from any connected chain and giving users the simplest onchain experience. To make this possible, the Eco Protocol brings together Routes, Accounts, and Crowd Liquidity (coming soon) to give app developers the ultimate flexibility while prioritizing speed, cost, and security.

            To make transaction costs negligible, minimize the number of necessary user actions, and avoid introducing centralized dependencies, Eco focuses on a singular, opinionated use case: fast, cheap, single-click stablecoin transaction execution anywhere across Ethereum (and eventually beyond). Eco is designed on the premise that stablecoins are the most intuitive and interoperable asset to bring users onchain. Eco makes it as fast and easy as possible for onchain app developers to attract stablecoin liquidity, price onchain actions in everyday currencies, and enable one-click sends to any supported chain or application.

            Eco Routes provide developers with secure and cheap token transfer pathways between any other rollup settling on Ethereum (L2 or L3), with a network of fillers providing on-demand liquidity. Eco Accounts provides developers with a seamless way to manage cross-chain accounts with chain-abstracted balances, making it easy to support cross-chain interactions. The Eco Network will eventually aggregate liquidity to make it easy for app developers to provide users with more intuitive and cost-minimized onchain experiences denominated in stablecoins.
        `
    );
};

main().catch(console.error);
