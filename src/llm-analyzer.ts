import { writeFile } from "node:fs/promises";
import type OpenAI from "openai";
import dedent from "dedent";
import type {
    ContractMeta,
    FunctionMeta,
    ModifierMeta,
} from "./types/metadata";
import type { AsyncResult } from "./types/result";
import type { VectorDbProcessor } from "./vector-db-processor";
import type { FileScopeExtractor, ScopeExtractor } from "./scope-extractor";

function getFunctionDeps(
    scope: ScopeExtractor,
    contract: ContractMeta,
    func: FunctionMeta,
    analContext: string[],
    visited: Set<string>,
    isRoot: boolean = false
) {
    const key = `function:${contract.name}:${func.name}`;
    if (visited.has(key)) return;
    visited.add(key);

    if (!isRoot) {
        analContext.push(`
            Function dependency(${func.name}):
            \`\`\`solidity
            ${func.codeDoc === undefined ? "" : `/*\n${func.codeDoc}\n*/`}
            ${func.code}
            \`\`\`
        `);
    }

    // Handle modifiers recursively
    for (const modPath of func.usedModifiers) {
        const [modContractName, modName] = modPath.split(".");
        const modResult = findModifier(scope, modContractName, modName);
        if (modResult !== undefined) {
            const [modContract, mod] = modResult;
            getModifierDeps(scope, modContract, mod, analContext, visited);
        }
    }

    // Handle internal calls recursively
    for (const fn of func.internalCalls) {
        const [fnContractName, fnName] = fn.split(".");
        const fnResult = findFunction(scope, fnContractName, fnName);
        if (fnResult !== undefined) {
            const [fnContract, fn] = fnResult;
            getFunctionDeps(scope, fnContract, fn, analContext, visited);
        }
    }

    // Handle external calls(interfaces)
    for (const extFn of func.externalCalls) {
        const [extFnContractName, extFnName] = extFn.split(".");
        const extFnResult = findFunction(scope, extFnContractName, extFnName);
        if (extFnResult !== undefined) {
            const [extFnContract, extFn] = extFnResult;
            getFunctionDeps(scope, extFnContract, extFn, analContext, visited);
        }
    }
}

function getModifierDeps(
    scope: ScopeExtractor,
    contract: ContractMeta,
    mod: ModifierMeta,
    analContext: string[],
    visited: Set<string>
) {
    const key = `modifier:${contract.name}:${mod.name}`;
    if (visited.has(key)) return;
    visited.add(key);

    analContext.push(`
        Function dependency(${mod.name}):
        \`\`\`solidity
        ${mod.codeDoc === undefined ? "" : `/*\n${mod.codeDoc}\n*/`}
        ${mod.code}
        \`\`\`
    `);

    // Handle internal calls recursively
    for (const fn of mod.internalCalls) {
        const [fnContractName, fnName] = fn.split(".");
        const fnResult = findFunction(scope, fnContractName, fnName);
        if (fnResult !== undefined) {
            const [fnContract, fn] = fnResult;
            getFunctionDeps(scope, fnContract, fn, analContext, visited);
        }
    }

    // Handle external calls(interfaces)
    for (const extFn of mod.externalCalls) {
        const [extFnContractName, extFnName] = extFn.split(".");
        const extFnResult = findFunction(scope, extFnContractName, extFnName);
        if (extFnResult !== undefined) {
            const [extFnContract, extFn] = extFnResult;
            getFunctionDeps(scope, extFnContract, extFn, analContext, visited);
        }
    }
}

function findFunction(
    scope: ScopeExtractor,
    contractName: string,
    funcName: string
): [ContractMeta, FunctionMeta] | undefined {
    const targetContract = scope.contracts.find((c) => c.name === contractName);
    if (targetContract !== undefined) {
        const fn = targetContract.functions.find((f) => f.name === funcName);
        if (fn !== undefined) return [targetContract, fn];
    }
}

function findModifier(
    scope: ScopeExtractor,
    contractName: string,
    modName: string
): [ContractMeta, ModifierMeta] | undefined {
    const targetContract = scope.contracts.find((c) => c.name === contractName);
    if (targetContract !== undefined) {
        const mod = targetContract.modifiers.find((m) => m.name === modName);
        if (mod !== undefined) return [targetContract, mod];
    }
}

export class LLMAnalyzer {
    private openai: OpenAI;
    private vectorDb: VectorDbProcessor;

    constructor(openai: OpenAI, vectorDb: VectorDbProcessor) {
        this.openai = openai;
        this.vectorDb = vectorDb;
    }

    public async anal(
        scope: ScopeExtractor,
        contract: ContractMeta,
        funcName?: string
    ): AsyncResult {
        for (const func of contract.functions) {
            if (funcName !== undefined && funcName !== func.name) {
                continue;
            }

            /* const query = `Analyze the function "${func.name}" in contract "${contract.name}".
            Include used modifiers, global state, emitted events, internal calls, external calls, Calls via 'Using' directive.`;

            // 1. Obtain query embeddings
            const embeddingResult =
                await this.vectorDb.generateEmbedding(query);
            if (!embeddingResult.success) {
                return { success: false };
            }
            const embedding = embeddingResult.return;

            // TODO: 2. Query vector(RAG) for llm context
            const searchResults = await this.vectorDb.pcIndex.query({
                vector: embedding,
                topK: 10,
                includeMetadata: true,
                filter: {
                    // contractName: contract.name,
                    $or: [
                        {
                            name: func.name,
                        },
                        { code: { $exists: true } },
                    ],
                },
            });

            const searchMeta = searchResults.matches.map((m) => m.metadata);
            const context: string[] = searchMeta
                .filter((m) => m !== undefined)
                .map((m) => (m as any).code); */

            const analContext: string[] = [];
            const visited = new Set<string>();
            getFunctionDeps(scope, contract, func, analContext, visited, true);

            // 3. Query LLM for smart contract analysis
            // TODO: Add relevant shit - context, deps graph, etc..
            // TODO: Enhance prompt
            const prompt = `
                Analyze the following Solidity function for vulnerabilities. Ensure, that function code met audit specifications.
                Do not include bugs related to zero address checks, gas optimizations, code optimizations, code refactoring, gas inefficiencies.


                Function code:
                \`\`\`solidity
                ${func.codeDoc === undefined ? "" : `/*\n${func.codeDoc}\n*/`}
                ${func.code}
                \`\`\`


                ${analContext.join("")}


                Contract global state code:
                \`\`\`solidity
                ${contract.globalVars.map((gvar) => (gvar.codeDoc === undefined ? `${gvar.code};` : `/*\n${gvar.codeDoc}\n*/\n${gvar.code};`)).join("\n")}
                \`\`\`


                Provide a structured analysis in markdown format with:
                - Vulnerability descriptions.
                - Severity levels.
                - Suggested fixes.
                If you can't find vulnerability, output only - '# No vulnerability found'
                If you can't understand what function is doing, output only - '# I can't understand function'
            `;

            console.log(`Trying to analyze with:\n${prompt}`);

            try {
                const llmResult = await this.openai.chat.completions.create({
                    model: "o1-preview",
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                });

                await writeFile(
                    `reports/${contract.name}-${func.name}.md`,
                    llmResult.choices[0].message.content!
                );

                console.log(
                    `LLM audit generated for: ${contract.name}-${func.name}`
                );
            } catch (error) {
                console.error(error);

                // TODO: Catch error
                return { success: false };
            }
        }

        return { success: true };
    }

    public async analv1(
        scopeName: string,
        contracts: ContractMeta[],
        auditSpecs?: string,
        docs?: string
    ): AsyncResult {
        // 1. Try to detect vulnerabilities N times.
        const detectionPrompt = dedent`
            You are solidity smart contracts security researcher and auditor. Try to find medium/high severity vulnerabilities
            in provided code scope considering audit specs and project docs. A scope may contain a single contract or multiple contracts.
            Smart contracts may or may not be logically related, so consider the relationship during analysis.
            Here's a list of example vulnerabilities that don't fit our criteria: gas optimizations, code optimizations, documentation style, missing events, missing documentation.
            If you can't find a guaranteed vulnerability, then output - # No vulnerabilities detected.
            It's important to provide proof of concept for each vulnerability.
            
            I will provide audit specifications, project documentation and code in relevant XML tags.


            Audit specifications:
            <auditSpecs>
            ${auditSpecs === undefined ? "Empty" : auditSpecs}
            </auditSpecs>

            Project documentation:
            <projectDocs>
            ${docs === undefined ? "Empty" : docs}
            </projectDocs>

            Smart contracts scope:
            ${contracts.map((contract) => `<code>\n${contract.code}\n</code>\n`)}
        `;

        console.log(detectionPrompt);

        // Spawn N LLM async calls
        const MAX_N: number = 5;
        const tasks = [];
        for (let n = 0; n < MAX_N; n++) {
            tasks.push(
                this.openai.chat.completions.create({
                    model: "o1-preview",
                    messages: [
                        {
                            role: "user",
                            content: detectionPrompt,
                        },
                    ],
                })
            );
        }

        console.log(`[?] Calling LLM(s)`);

        const findings = (await Promise.all(tasks)).map(
            (task) => task.choices[0].message.content!
        );

        console.log(`[+] Findings received..`);

        // 2. Synthesizes outputs, remove shit and save result.
        const synthesizerPrompt = dedent`
            I will provide security audit reports for solidity smart contracts project.
            Synthesize all findings and remove duplicates. Preserve the most realistic vulnerabilities with
            medium/high severity levels only. Provide single, formatted, synthesized audit report in markdown
            with the following sections for each vulnerability: Description, Severity, Fix.


            Each report will be provided in separate XML tag below:
            ${findings.map((report) => `<report>\n${report}\n</report>`)}
        `;
        const reportPath = `reports/${scopeName}.md`;

        try {
            const llmResult = await this.openai.chat.completions.create({
                model: "chatgpt-4o-latest",
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content: synthesizerPrompt,
                    },
                ],
            });

            await writeFile(reportPath, llmResult.choices[0].message.content!);
        } catch (error) {
            console.error(error);

            return { success: false };
        }

        console.log(`Report ${reportPath} saved!`);
        return { success: true };
    }

    public async analv1Scope(
        scope: FileScopeExtractor,
        scopeName: string,
        auditSpecs?: string,
        docs?: string
    ): AsyncResult {
        // 1. Try to detect vulnerabilities N times.
        const detectionPrompt = dedent`
            You are solidity smart contracts security researcher and auditor. Try to find medium/high severity vulnerabilities
            in provided code scope considering audit specs and project docs. A scope may contain a single contract or multiple contracts.
            Smart contracts may or may not be logically related, so consider the relationship during analysis.
            Here's a list of example vulnerabilities that don't fit our criteria: gas optimizations, code optimizations, documentation style, missing events, missing documentation.
            If you can't find a guaranteed vulnerability, then output - # No vulnerabilities detected.
            
            I will provide audit specifications, project documentation and code in relevant XML tags.


            Audit specifications:
            <auditSpecs>
            ${auditSpecs === undefined ? "Empty" : auditSpecs}
            </auditSpecs>

            Project documentation:
            <projectDocs>
            ${docs === undefined ? "Empty" : docs}
            </projectDocs>

            Smart contracts scope:
            ${scope
                .getFiles()
                .entries()
                .map(
                    ([filePath, [fileName, code]]) =>
                        `${fileName}:\n<code>\n${code}\n</code>\n`
                )
                .toArray()
                .join("\n")}
        `;

        console.log(detectionPrompt);

        // Spawn N LLM async calls
        const MAX_N: number = 5;
        const tasks = [];
        for (let n = 0; n < MAX_N; n++) {
            tasks.push(
                this.openai.chat.completions.create({
                    model: "o1-preview",
                    messages: [
                        {
                            role: "user",
                            content: detectionPrompt,
                        },
                    ],
                })
            );
        }

        console.log(`[?] Calling LLM(s)`);

        const findings = (await Promise.all(tasks)).map(
            (task) => task.choices[0].message.content!
        );

        console.log(`[+] Findings received..`);

        // 2. Synthesizes outputs, remove shit and save result.
        const synthesizerPrompt = dedent`
            I will provide security audit reports for solidity smart contracts project.
            Synthesize all findings and remove duplicates. Preserve the most realistic vulnerabilities with
            medium/high severity levels only. Provide single, formatted, synthesized audit report in markdown
            with the following sections for each vulnerability: Description, Severity, Fix.


            Each report will be provided in separate XML tag below:
            ${findings.map((report) => `<report>\n${report}\n</report>`)}
        `;
        const reportPath = `reports/${scopeName}.md`;

        try {
            const llmResult = await this.openai.chat.completions.create({
                model: "chatgpt-4o-latest",
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content: synthesizerPrompt,
                    },
                ],
            });

            await writeFile(reportPath, llmResult.choices[0].message.content!);
        } catch (error) {
            console.error(error);

            return { success: false };
        }

        console.log(`Report ${reportPath} saved!`);
        return { success: true };
    }

    public async analv1Backtrack(
        scope: FileScopeExtractor,
        scopeName: string,
        vulnDescription: string,
        maxIters: number,
        models: [string, string],
        auditSpecs?: string,
        docs?: string
    ): AsyncResult {
        // 1. Try to detect vulnerabilities N times.
        const detectionPrompt = dedent`
            You are solidity smart contracts security researcher and auditor. Try to find medium/high severity vulnerabilities
            in provided code scope considering audit specs and project docs. A scope may contain a single contract or multiple contracts.
            Smart contracts may or may not be logically related, so consider the relationship during analysis.
            Here's a list of example vulnerabilities that don't fit our criteria: gas optimizations, code optimizations, documentation style, missing events, missing documentation.
            If you can't find a guaranteed vulnerability, then output - # No vulnerabilities detected.

            I will provide audit specifications, project documentation and code in relevant XML tags.


            Audit specifications:
            <auditSpecs>
            ${auditSpecs === undefined ? "Empty" : auditSpecs}
            </auditSpecs>

            Project documentation:
            <projectDocs>
            ${docs === undefined ? "Empty" : docs}
            </projectDocs>

            Smart contracts scope:
            ${scope
                .getFiles()
                .entries()
                .map(
                    ([filePath, [fileName, code]]) =>
                        `${fileName}:\n<code>\n${code}\n</code>\n`
                )
                .toArray()
                .join("\n")}
        `;

        for (let n = 0; n < maxIters; n++) {
            console.log(`[?][${n + 1}/${maxIters}] Starting iteration`);

            // 1. Try to detect vulnerabilities
            let llmDetection: string;
            try {
                llmDetection =
                    (
                        await this.openai.chat.completions.create({
                            model: models[0],
                            messages: [
                                {
                                    role: "user",
                                    content: detectionPrompt,
                                },
                            ],
                        })
                    ).choices[0].message.content || "";
            } catch (error) {
                console.error(error);
                return { success: false };
            }

            console.log(`[?][${n + 1}/${maxIters}] Trying to validate..`);

            // 2. Try to validate vulnerability by backtrack input data(existing vulnerability)
            const validationPrompt = dedent`
                I will provide solidity smart contracts audit report and description of existing vulnerability in XML tags.
                You need to detect existing vulnerability in audit report. If the same vulnerability detected, output
                lowercase 'yes' without any quotes. If you can't find same vulnerability, output lowercase 'no' without any quotes.
                Your available outputs are only 'yes' or 'no' in lowercase without quotes.


                Audit report:
                <auditReport>
                ${llmDetection}
                </auditReport>

                Existing vulnerability description:
                <existingVuln>
                ${vulnDescription}
                </existingVuln>
            `;

            try {
                const llmResult = await this.openai.chat.completions.create({
                    model: models[1],
                    temperature: 0,
                    messages: [
                        {
                            role: "user",
                            content: validationPrompt,
                        },
                    ],
                });
                const output = llmResult.choices[0].message.content;
                const isValidOutput = output === "yes" || output === "no";

                if (!isValidOutput) {
                    console.error(`Invalid output structure: ${output}`);
                    return { success: false };
                }

                if (output === "yes") {
                    const reportPath = `reports/${scopeName}_validated_${n}.md`;
                    await writeFile(reportPath, llmDetection);

                    console.log(
                        `[+][${n + 1}/${maxIters}] I FOUND VALIDATION!, DETECTION SAVED..`
                    );

                    return { success: true };
                }

                console.log(`[-][${n + 1}/${maxIters}] No vulnerabilities :(`);
            } catch (error) {
                console.error(error);
                return { success: false };
            }
        }

        return { success: true };
    }
}
