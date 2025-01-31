import { appendFile, readFile } from "node:fs/promises";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ASTReader, compileSol, FunctionDefinition } from "solc-typed-ast";

const anthropic = new Anthropic();
const openai = new OpenAI();

const Severity = z.enum(["high", "medium", "info"]);

const Vulnerability = z.object({
    description: z.string(),
    severity: Severity,
    fix: z.string(),
});

const FindingsResponse = z.object({
    findings: z.array(Vulnerability),
});

const anthropicCall = async (): Promise<z.infer<
    typeof FindingsResponse
> | null> => {
    const completion = await anthropic.messages.create({
        model: "claude-3-opus-latest",
        temperature: 0,
        max_tokens: 4096,
        system: `You are experienced solidity smart contracts security auditor. Your main goal is to find security exploits in provided source code that lead to funds or tokens loss.
                I will provide source code(Prefixed with 'Code:' and placed between triple single quotes) and protocol description(Prefixed with 'Description:' and placed between triple single quotes) where i may specify business logic or rules. Let's focus on high and medium severity levels, to be clear here are our criteria:
                - high: Direct loss of funds without (extensive) limitations of external conditions. The loss of the affected party must be significant(more than 1% funds loss).
                - medium: Causes a loss of funds but requires certain external conditions or specific states, or a loss is highly constrained. The loss must be relevant to the affected party. Or Breaks core contract functionality, rendering the contract useless or leading to loss of funds that's relevant to the affected party(more than 0.01% funds loss).
                - info: Potential Code Or Smart Contract Issues In Future, Code Good Practice, Code Optimization, Future Issues, Non-Standard Tokens, Usage Of 'call vs transfer' for transfers, User Experience Issues, Zero Address Checks, Gas Optimizations, Incorrect Event Values, User Input Validation and other things that not result to funds loss. But remember there are always exceptions and even input validation may result in funds loss and high severity.

                You should consider smart contract business logic(protocol description) which will be provided in input. Be sure to verify that the smart contract works as described in provided description and the business logic is appropriate.
                Important rule for you - if current logic does not allow exploit vulnerability that you found then this vulnerability should be with 'info' severity or should be delete(because it's invalid).

                Your suggested 'fix' needs to be in markdown format, without any additional explanations or unnecessary text but with comments for each line which you add or replace.
                Please write vulnerability description clearly and concisely to make it easier for the audit reviewer(or protocol team) to understand the context, problem and attach source code line or function name(if possible).
                
                Provide output in JSON format with following schema:
                '''
                {
                    "findings": {
                        "description": "string",
                        "severity": "high" | "medium" | "info",
                        "fix": "string"
                    }[]
                }
                '''`,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Description:
                        '''
                        This contract is designed to act as a time vault.
                        User can deposit into this contract but cannot withdraw for at least a week.
                        User can also extend the wait time beyond the 1 week waiting period.
                        '''

                        Code:
                        '''
                        pragma solidity ^0.7.6;

                        contract TimeLock {
                            mapping(address => uint256) public balances;
                            mapping(address => uint256) public lockTime;

                            function deposit() external payable {
                                balances[msg.sender] += msg.value;
                                lockTime[msg.sender] = block.timestamp + 1 weeks;
                            }

                            function increaseLockTime(uint256 _secondsToIncrease) public {
                                lockTime[msg.sender] += _secondsToIncrease;
                            }

                            function withdraw() public {
                                require(balances[msg.sender] > 0, "Insufficient funds");
                                require(block.timestamp > lockTime[msg.sender], "Lock time not expired");

                                uint256 amount = balances[msg.sender];
                                balances[msg.sender] = 0;

                                (bool sent,) = msg.sender.call{value: amount}("");
                                require(sent, "Failed to send Ether");
                            }
                        }
                        '''`,
                    },
                ],
            },
        ],
    });

    const resp = completion.content[0];
    if (resp.type === "text") {
        return await FindingsResponse.parseAsync(JSON.parse(resp.text));
    } else {
        return null;
    }
};

const openaiO1Call = async (): Promise<z.infer<
    typeof FindingsResponse
> | null> => {
    const completion = await openai.chat.completions.create({
        model: "o1-preview",
        messages: [
            {
                role: "user",
                content: `You are experienced solidity smart contracts security auditor. Your main goal is to find security exploits in provided source code that lead to funds or tokens loss.
                I will provide source code(Prefixed with 'Code:' and placed between triple single quotes) and protocol description(Prefixed with 'Description:' and placed between triple single quotes) where i may specify business logic or rules. Let's focus on high and medium severity levels, to be clear here are our criteria:
                - high: Direct loss of funds without (extensive) limitations of external conditions. The loss of the affected party must be significant(more than 1% funds loss).
                - medium: Causes a loss of funds but requires certain external conditions or specific states, or a loss is highly constrained. The loss must be relevant to the affected party. Or Breaks core contract functionality, rendering the contract useless or leading to loss of funds that's relevant to the affected party(more than 0.01% funds loss).
                - info: Potential Code Or Smart Contract Issues In Future, Code Good Practice, Code Optimization, Future Issues, Non-Standard Tokens, Usage Of 'call vs transfer' for transfers, User Experience Issues, Zero Address Checks, Gas Optimizations, Incorrect Event Values, User Input Validation and other things that not result to funds loss. But remember there are always exceptions and even input validation may result in funds loss and high severity.

                You should consider smart contract business logic(protocol description) which will be provided in input. Be sure to verify that the smart contract works as described in provided description and the business logic is appropriate.
                Important rule for you - if current logic does not allow exploit vulnerability that you found then this vulnerability should be with 'info' severity or should be delete(because it's invalid).

                Your suggested 'fix' needs to be in markdown format, without any additional explanations or unnecessary text but with comments for each line which you add or replace.
                Please write vulnerability description clearly and concisely to make it easier for the audit reviewer(or protocol team) to understand the context, problem and attach source code line or function name(if possible).
                
                Provide output in raw JSON format with following schema(do not wrap output into markdown format):
                '''
                {
                    "findings": {
                        "description": "string",
                        "severity": "high" | "medium" | "info",
                        "fix": "string"
                    }[]
                }
                '''`,
            },
            {
                role: "user",
                content: `Description:
                '''
                This contract is designed to act as a time vault.
                User can deposit into this contract but cannot withdraw for at least a week.
                User can also extend the wait time beyond the 1 week waiting period.
                '''
                
                Code:
                '''
                pragma solidity ^0.7.6;

                contract TimeLock {
                    mapping(address => uint256) public balances;
                    mapping(address => uint256) public lockTime;

                    function deposit() external payable {
                        balances[msg.sender] += msg.value;
                        lockTime[msg.sender] = block.timestamp + 1 weeks;
                    }

                    function increaseLockTime(uint256 _secondsToIncrease) public {
                        lockTime[msg.sender] += _secondsToIncrease;
                    }

                    function withdraw() public {
                        require(balances[msg.sender] > 0, "Insufficient funds");
                        require(block.timestamp > lockTime[msg.sender], "Lock time not expired");

                        uint256 amount = balances[msg.sender];
                        balances[msg.sender] = 0;

                        (bool sent,) = msg.sender.call{value: amount}("");
                        require(sent, "Failed to send Ether");
                    }
                }
                '''`,
            },
        ],
    });

    const resp = completion.choices[0].message.content;
    if (resp !== null) {
        return await FindingsResponse.parseAsync(JSON.parse(resp));
    } else {
        return null;
    }
};

const openaiO1CallWithParams = async (
    description: string,
    code: string
): Promise<z.infer<typeof FindingsResponse> | null> => {
    const completion = await openai.chat.completions.create({
        model: "o1-preview",
        messages: [
            {
                role: "user",
                content: `You are experienced solidity smart contracts security auditor. Your main goal is to find security exploits in provided source code that lead to funds or tokens loss.
                I will provide source code(Prefixed with 'Code:' and placed between triple single quotes) and protocol description(Prefixed with 'Description:' and placed between triple single quotes) where i may specify business logic or rules. Let's focus on high and medium severity levels, to be clear here are our criteria:
                - high: Direct loss of funds without (extensive) limitations of external conditions. The loss of the affected party must be significant(more than 1% funds loss).
                - medium: Causes a loss of funds but requires certain external conditions or specific states, or a loss is highly constrained. The loss must be relevant to the affected party. Or Breaks core contract functionality, rendering the contract useless or leading to loss of funds that's relevant to the affected party(more than 0.01% funds loss).
                - info: Potential Code Or Smart Contract Issues In Future, Code Good Practice, Code Optimization, Future Issues, Non-Standard Tokens, Usage Of 'call vs transfer' for transfers, User Experience Issues, Zero Address Checks, Gas Optimizations, Incorrect Event Values, User Input Validation and other things that not result to funds loss. But remember there are always exceptions and even input validation may result in funds loss and high severity.

                You should consider smart contract business logic(protocol description) which will be provided in input. Be sure to verify that the smart contract works as described in provided description and the business logic is appropriate.
                Important rule for you - if current logic does not allow exploit vulnerability that you found then this vulnerability should be with 'info' severity or should be delete(because it's invalid).

                Your suggested 'fix' needs to be in markdown format, without any additional explanations or unnecessary text but with comments for each line which you add or replace.
                Please write vulnerability description clearly and concisely to make it easier for the audit reviewer(or protocol team) to understand the context, problem and attach source code line or function name(if possible).
                
                Provide output in raw JSON format with following schema(do not wrap output into markdown format):
                '''
                {
                    "findings": {
                        "description": "string",
                        "severity": "high" | "medium" | "info",
                        "fix": "string"
                    }[]
                }
                '''`,
            },
            {
                role: "user",
                content: `Description:
                '''
                ${description}
                '''
                
                Code:
                '''
                ${code}
                '''`,
            },
        ],
    });

    console.log(JSON.stringify(completion.choices[0].message));

    const resp = completion.choices[0].message.content;
    if (resp !== null) {
        return await FindingsResponse.parseAsync(JSON.parse(resp));
    } else {
        return null;
    }
};

const openaiCall = async (): Promise<z.infer<
    typeof FindingsResponse
> | null> => {
    const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: `You are experienced solidity smart contracts security auditor. Your main goal is to find security exploits in provided source code that lead to funds or tokens loss.
                I will provide source code(Prefixed with 'Code:' and placed between triple single quotes) and protocol description(Prefixed with 'Description:' and placed between triple single quotes) where i may specify business logic or rules. Let's focus on high and medium severity levels, to be clear here are our criteria:
                - high: Direct loss of funds without (extensive) limitations of external conditions. The loss of the affected party must be significant(more than 1% funds loss).
                - medium: Causes a loss of funds but requires certain external conditions or specific states, or a loss is highly constrained. The loss must be relevant to the affected party. Or Breaks core contract functionality, rendering the contract useless or leading to loss of funds that's relevant to the affected party(more than 0.01% funds loss).
                - info: Potential Code Or Smart Contract Issues In Future, Code Good Practice, Code Optimization, Future Issues, Non-Standard Tokens, Usage Of 'call vs transfer' for transfers, User Experience Issues, Zero Address Checks, Gas Optimizations, Incorrect Event Values, User Input Validation and other things that not result to funds loss. But remember there are always exceptions and even input validation may result in funds loss and high severity.

                You should consider smart contract business logic(protocol description) which will be provided in input. Be sure to verify that the smart contract works as described in provided description and the business logic is appropriate.
                Important rule for you - if current logic does not allow exploit vulnerability that you found then this vulnerability should be with 'info' severity or should be delete(because it's invalid).

                Your suggested 'fix' needs to be in markdown format, without any additional explanations or unnecessary text but with comments for each line which you add or replace.
                Please write vulnerability description clearly and concisely to make it easier for the audit reviewer(or protocol team) to understand the context, problem and attach source code line or function name(if possible).`,
            },
            {
                role: "user",
                content: `Description:
                '''
                This contract is designed to act as a time vault.
                User can deposit into this contract but cannot withdraw for at least a week.
                User can also extend the wait time beyond the 1 week waiting period.
                '''
                
                Code:
                '''
                pragma solidity ^0.7.6;

                contract TimeLock {
                    mapping(address => uint256) public balances;
                    mapping(address => uint256) public lockTime;

                    function deposit() external payable {
                        balances[msg.sender] += msg.value;
                        lockTime[msg.sender] = block.timestamp + 1 weeks;
                    }

                    function increaseLockTime(uint256 _secondsToIncrease) public {
                        lockTime[msg.sender] += _secondsToIncrease;
                    }

                    function withdraw() public {
                        require(balances[msg.sender] > 0, "Insufficient funds");
                        require(block.timestamp > lockTime[msg.sender], "Lock time not expired");

                        uint256 amount = balances[msg.sender];
                        balances[msg.sender] = 0;

                        (bool sent,) = msg.sender.call{value: amount}("");
                        require(sent, "Failed to send Ether");
                    }
                }
                '''`,
            },
        ],
        response_format: zodResponseFormat(
            FindingsResponse,
            "findings_response"
        ),
        temperature: 0,
    });

    return completion.choices[0].message.parsed;
};

const exportTrainData = async () => {
    const result: z.infer<typeof FindingsResponse> = {
        findings: [
            {
                severity: "medium",
                description:
                    "Vault admin cannot update `tokensReceiver`. However, the specs claim that admin should be able to update it. This is a discrepancy between code and specs where the admin does not have the ability to update the investment recipient address as expected.",
                fix: `'''solidity
                function __ManageableVault_init(...) internal onlyInitializing {
                    ...
                    // Create a setter function for tokensReceiver.
                    tokensReceiver = _receiversInitParams.tokensReceiver;
                    ...
                }
                '''`,
            },
            {
                severity: "medium",
                description:
                    "When users are redeeming from `MBasisRedemptionVaultWithSwapper`, if there is not enough `tokenOut` balance, it will first conduct a mBasis->mTBill swap and try to redeem from the mTBill redemption vault. The issue here is, when this happens, the daily limit and token allowance is only deducted from the mTBill redemption vault, and not the original `MBasisRedemptionVaultWithSwapper` contract.",
                fix: `'''solidity
                    // Update mBasis daily limit and allowance when conducting mBasis->mTBill swap for MBasisRedemptionVaultWithSwapper
                '''`,
            },
            {
                severity: "medium",
                description:
                    "Storage of vault contracts (e.g. `DepositVault`, `RedemptionVault`, ...) contracts might be corrupted during an upgrade. The vault contracts are meant to be upgradeable. However, it inherits contracts that are not upgrade-safe. The gap storage has been implemented on the `DepositVault`/`RedemptionVault`/`ManageableVault`/`WithMidasAccessControl`. However, no gap storage is implemented on `Pausable`/`Greenlistable`/`Blacklistable`/`WithSanctionsList`. Among these contracts, `Pausable`/`Greenlistable`/`WithSanctionsList` are contracts with defined variables (non pure-function), and they should have gaps as well. Without gaps, adding new storage variables to any of these contracts can potentially overwrite the beginning of the storage layout of the child contract, causing critical misbehaviors in the system. Also, `CustomAggregatorV3CompatibleFeed` does not have gaps but is inherited by `MBasisCustomAggregatorFeed`/`MTBillCustomAggregatorFeed`. If the feed wants to be upgradeable, `CustomAggregatorV3CompatibleFeed` should also have gaps.",
                fix: `'''solidity
                    // Add gaps for non pure-function contracts: Pausable/Greenlistable/WithSanctionsList/CustomAggregatorV3CompatibleFeed.
                '''`,
            },
            {
                severity: "medium",
                description:
                    "Standard redemption in `RedemptionVault` does not update token allowance. From the specs, we can know that there is a token allowance for redeeming. However, this allowance is not respected during standard redemption process(in `_redeemRequest`).",
                fix: `'''solidity
                    // Call _requireAndUpdateAllowance(tokenIn, amountToken); in _redeemRequest. Also check that is it a non-fiat redeem.
                '''`,
            },
            {
                severity: "medium",
                description:
                    "`RedemptionVaultWIthBUIDL` does not redeem full balance if BUIDL balance is less than 250k post transaction. According to the specs, there should be a feature that when redeeming BUIDL tokens, it should redeem full balance if the remaining BUIDL tokens is less than 250k. However, no such feature is implemented.",
                fix: `'''solidity
                    // Implement such feature.
                '''`,
            },
            {
                severity: "medium",
                description:
                    "`RedemptionVaultWIthBUIDL.sol#redeemInstant` will always DoS due to incorrect contract call. In `RedemptionVaultWIthBUIDL` contract, it uses the BUIDL contracts to redeem BUIDL tokens to USDC tokens, and users are expected to always receive USDC tokens. The issue here is, the code wrongly assumes buidlRedemption.liquidity() is the liquiditySource, when it should be the USDC token. This will always lead to DoS for the buidlLiquiditySource.token() call in redeemInstant since USDC does not support .token() call.",
                fix: `'''solidity
                    // Use buidlSettlement.liquiditySource() to get the liquidity source. Also add the liquiditySource API to ISettlement.
                '''`,
            },
        ],
    };

    const descriptionData = await readFile(
        "code-scope/2024-08-midas-minter-redeemer/description.md"
    );

    const codeData = await readFile(
        "code-scope/2024-08-midas-minter-redeemer/build.txt"
    );

    const data = {
        messages: [
            {
                role: "system",
                content: `You are experienced solidity smart contracts security auditor. Your main goal is to find security exploits in provided source code that lead to funds or tokens loss.
                I will provide source code(Prefixed with 'Code:' and placed between triple single quotes) and protocol description(Prefixed with 'Description:' and placed between triple single quotes) where i may specify business logic or rules. Let's focus on high and medium severity levels, to be clear here are our criteria:
                - high: Direct loss of funds without (extensive) limitations of external conditions. The loss of the affected party must be significant(more than 1% funds loss).
                - medium: Causes a loss of funds but requires certain external conditions or specific states, or a loss is highly constrained. The loss must be relevant to the affected party. Or Breaks core contract functionality, rendering the contract useless or leading to loss of funds that's relevant to the affected party(more than 0.01% funds loss).
                - info: Potential Code Or Smart Contract Issues In Future, Code Good Practice, Code Optimization, Future Issues, Non-Standard Tokens, Usage Of 'call vs transfer' for transfers, User Experience Issues, Zero Address Checks, Gas Optimizations, Incorrect Event Values, User Input Validation and other things that not result to funds loss. But remember there are always exceptions and even input validation may result in funds loss and high severity.

                You should consider smart contract business logic(protocol description) which will be provided in input. Be sure to verify that the smart contract works as described in provided description and the business logic is appropriate.
                Important rule for you - if current logic does not allow exploit vulnerability that you found then this vulnerability should be with 'info' severity or should be delete(because it's invalid).

                Your suggested 'fix' needs to be in markdown format, without any additional explanations or unnecessary text but with comments for each line which you add or replace.
                Please write vulnerability description clearly and concisely to make it easier for the audit reviewer(or protocol team) to understand the context, problem and attach source code line or function name(if possible).`,
            },
            {
                role: "user",
                content: `Description:
                '''
                ${descriptionData}
                '''
                
                Code:
                '''
                ${codeData}
                '''`,
            },
            {
                role: "assistant",
                content: JSON.stringify(result),
            },
        ],
    };

    await appendFile(
        "train-data/01-contest.jsonl",
        `${JSON.stringify(data)}\n`
    );
};

const getScopeAST = async () => {
    const contractFilePath =
        "audit-code/2024-08-midas-minter-redeemer/midas-contracts/contracts/DepositVault.sol";
    const file = await readFile(contractFilePath);

    const reader = new ASTReader();
    const result = await compileSol(contractFilePath, "auto");

    const units = reader.read(result.data);
    const contractAst = units.find(
        (unit) => unit.sourceEntryKey === contractFilePath
    );
    if (contractAst === undefined) {
        console.error("Contract ast is not found!");
        return;
    }

    const funcs =
        contractAst.lastChild!.getChildrenByTypeString<FunctionDefinition>(
            "FunctionDefinition"
        );

    for (const func of funcs) {
        const funcString = func.extractSourceFragment(new Uint8Array(file));
        const decoder = new TextDecoder();
        const x = decoder.decode(funcString);
        console.log(x);
    }
};

const main = async () => {
    await getScopeAST();

    // await exportTrainData();

    /* const descr = await readFile(
        "code-scope/2024-08-midas-minter-redeemer/description copy.md"
    );
    const code = await readFile(
        "code-scope/2024-08-midas-minter-redeemer/build.txt"
    );

    const resp = await openaiO1CallWithParams(
        descr.toString(),
        code.toString()
    );
    if (resp !== null) {
        resp.findings.sort((a, b) => {
            function weight(s: z.infer<typeof Severity>) {
                if (s === "high") {
                    return 1;
                } else if (s === "medium") {
                    return 2;
                } else {
                    return 3;
                }
            }

            return weight(a.severity) - weight(b.severity);
        });

        for (const f of resp.findings) {
            console.log(`Severity: ${f.severity}`);
            console.log(`Description: ${f.description}`);
            console.log(`Fix: ${f.fix}`);
            console.log("-----\n");
        }
    } else {
        console.warn("Findings resp is null!");
    } */
};

main();
