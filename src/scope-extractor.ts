import { readFile, exists } from "node:fs/promises";
import path from "node:path";
import {
    ASTNode,
    ASTReader,
    compileSol,
    ContractDefinition,
    EmitStatement,
    ExternalReferenceType,
    FunctionCall,
    FunctionCallKind,
    Identifier,
    MemberAccess,
    SourceUnit,
    StructuredDocumentation,
    type CompileResult,
} from "solc-typed-ast";
import type { AsyncResult, Result } from "./types/result";
import type { ContractMeta } from "./types/metadata";

export class ScopeExtractor {
    public contracts: ContractMeta[];

    private constructor() {
        this.contracts = [];
    }

    private static getCodeDoc(
        maybeDoc?: string | StructuredDocumentation
    ): string | undefined {
        return maybeDoc === undefined
            ? undefined
            : typeof maybeDoc === "string"
              ? maybeDoc
              : maybeDoc.text;
    }

    private static getSourceCode(
        fileData: Uint8Array,
        astNode: ASTNode
    ): string {
        return new TextDecoder().decode(
            astNode.extractSourceFragment(fileData)
        );
    }

    static async load(
        scopeFiles: string[],
        externalDepsPath: string
    ): AsyncResult<ScopeExtractor> {
        const scope = new ScopeExtractor();

        // 1. Compile all scope files
        let compResult: CompileResult;
        try {
            // TODO: Add base path and remappings support
            compResult = await compileSol(scopeFiles, "auto", {
                basePath: "audit-code/2025-01-peapods-finance/fraxlend",
                includePath: [
                    "audit-code/2025-01-peapods-finance/fraxlend/lib",
                    "audit-code/2025-01-peapods-finance/fraxlend/node_modules",
                ],
                remapping: [
                    "forge-std/=lib/forge-std/src/",
                    "ds-test/=lib/ds-test/src/",
                    /* "erc4626-tests/=lib/openzeppelin-contracts-upgradeable/lib/erc4626-tests/",
                    "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/",
                    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
                    "openzeppelin-contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/",
                    "openzeppelin-contracts/=lib/openzeppelin-contracts/",
                    "@uniswap/v2-core/=lib/v2-core/",
                    "@uniswap/v2-periphery/=lib/v2-periphery/",
                    "@uniswap/v3-core/=lib/v3-core/",
                    "@uniswap/v3-periphery/=lib/v3-periphery/",
                    "@safe-global/safe-smart-account/=lib/safe-smart-account/",
                    "murky/=lib/murky/src/",
                    "safe-smart-account/=lib/safe-smart-account/",
                    "solady/=lib/solady/src/",
                    "solmate/=lib/solmate/src/",
                    "permit2/=lib/permit2/src/", */
                ],
            });
        } catch (error) {
            console.error(error);

            // TODO: Catch errors
            return { success: false };
        }

        // 2. Extract AST units from scope
        const astReader = new ASTReader();
        let astUnits: SourceUnit[];
        try {
            astUnits = astReader.read(compResult.data);
        } catch (error) {
            console.error(error);

            // TODO: Catch errors
            return { success: false };
        }

        // 3. Extract RAG info from AST(for each smart-contract)
        const loadedAstUnits = new Set<string>();
        for (const astUnit of astUnits) {
            // Ensure there are no duplicates
            if (loadedAstUnits.has(astUnit.sourceEntryKey)) continue;
            loadedAstUnits.add(astUnit.sourceEntryKey);

            let fileData: Uint8Array;
            try {
                let fixedPath;

                const nodeModPath = path.join(
                    externalDepsPath,
                    "node_modules",
                    astUnit.sourceEntryKey
                );

                const libModPath = path.join(
                    externalDepsPath,
                    astUnit.sourceEntryKey
                );

                const directPath = astUnit.sourceEntryKey;

                if (await exists(directPath)) {
                    fixedPath = directPath;
                } else if (await exists(libModPath)) {
                    fixedPath = libModPath;
                } else if (await exists(nodeModPath)) {
                    fixedPath = nodeModPath;
                } else {
                    throw new Error("Can't resolve module path");
                }

                fileData = new Uint8Array(await readFile(fixedPath));
            } catch (error) {
                console.error(error);

                // TODO: Catch errors
                return { success: false };
            }

            const imports = [];
            for (const astImport of astUnit.vImportDirectives) {
                imports.push(this.getSourceCode(fileData, astImport));
            }

            const pragmas = [];
            for (const astPragma of astUnit.vPragmaDirectives) {
                pragmas.push(this.getSourceCode(fileData, astPragma));
            }

            // TODO: Extract docs/audit from external sources
            // TODO: Add dependency graph
            for (const astContract of astUnit.vContracts) {
                console.log(`${astUnit.sourceEntryKey} ${astContract.name}`);
                const usingMap: Record<string, string[]> = {};

                for (const astUsing of astContract.vUsingForDirectives) {
                    const libName = astUsing.vLibraryName?.name;
                    const typeName = astUsing.vTypeName?.typeString || "all";

                    if (libName !== undefined) {
                        if (!usingMap[typeName]) {
                            usingMap[typeName] = [];
                        }
                        usingMap[typeName].push(libName);
                    }
                }

                const codeDoc =
                    this.getCodeDoc(astContract.documentation) || "";
                const code = `${pragmas.join("\n")}\n\n${imports.join("\n")}\n\n/**\n${codeDoc}\n */\n${this.getSourceCode(fileData, astContract)}`;

                const contractMeta: ContractMeta = {
                    name: astContract.name,
                    code,
                    kind: astContract.kind,
                    derivedFromContracts: astContract.vLinearizedBaseContracts
                        .filter((base) => base.name !== astContract.name)
                        .map((base) => base.name),
                    globalVars: [],
                    modifiers: [],
                    functions: [],
                    events: [],
                    codeDoc,
                };

                // Extract global variables(name, code, type, codeDoc?, doc?)
                for (const astGlobalVar of astContract.vStateVariables) {
                    contractMeta.globalVars.push({
                        name: astGlobalVar.name,
                        code: this.getSourceCode(fileData, astGlobalVar),
                        typeString: astGlobalVar.typeString,
                        codeDoc: this.getCodeDoc(astGlobalVar.documentation),
                    });
                }

                // Extract modifiers(name, code, codeDoc?, doc?, emittedEvents, internalCalls, externalCalls)
                for (const astModifier of astContract.vModifiers) {
                    const internalCalls = new Set<string>();
                    const externalCalls = new Set<string>();

                    astModifier
                        .getChildrenByType(FunctionCall)
                        .forEach((funcCall) => {
                            if (
                                funcCall.vFunctionCallType ===
                                    ExternalReferenceType.UserDefined &&
                                funcCall.kind ===
                                    FunctionCallKind.FunctionCall &&
                                !(funcCall.parent instanceof EmitStatement)
                            ) {
                                const refDeclarationName = (
                                    funcCall.vReferencedDeclaration!
                                        .vScope as ContractDefinition
                                ).name;

                                const expr = funcCall.vExpression;
                                if (expr instanceof MemberAccess) {
                                    const baseType =
                                        expr.vExpression.typeString;

                                    if (
                                        baseType.includes("external") ||
                                        baseType.includes("contract")
                                    ) {
                                        // External
                                        externalCalls.add(
                                            `${refDeclarationName}.${funcCall.vFunctionName}`
                                        );
                                    } else if (
                                        baseType.includes("function") ||
                                        baseType.includes("internal")
                                    ) {
                                        // Internal
                                        internalCalls.add(
                                            `${refDeclarationName}.${funcCall.vFunctionName}`
                                        );
                                    } else {
                                        // TODO: Add `Using` calls parser to modifier
                                        /* const applicableLibs = Object.entries(
                                            usingMap
                                        )
                                            .filter(
                                                ([type]) =>
                                                    type === "all" ||
                                                    baseType.includes(type)
                                            )
                                            .flatMap(
                                                ([, libraries]) => libraries
                                            );

                                        applicableLibs.forEach((lib) =>
                                            usingCalls.add(
                                                `${lib}.${expr.memberName}`
                                            )
                                        ); */
                                    }
                                } else if (
                                    expr instanceof Identifier &&
                                    expr.typeString.includes("function")
                                ) {
                                    // Internal
                                    internalCalls.add(
                                        `${refDeclarationName}.${funcCall.vFunctionName}`
                                    );
                                }
                            }
                        });

                    contractMeta.modifiers.push({
                        name: astModifier.name,
                        code: this.getSourceCode(fileData, astModifier),
                        codeDoc: this.getCodeDoc(astModifier.documentation),
                        emittedEvents: astModifier
                            .getChildrenByType(EmitStatement)
                            .map(
                                (emit) =>
                                    `${(emit.vEventCall.vReferencedDeclaration!.vScope as ContractDefinition).name}.${emit.vEventCall.vFunctionName}`
                            ),
                        internalCalls: Array.from(internalCalls),
                        externalCalls: Array.from(externalCalls),
                    });
                }

                // Extract functions(name, code, codeDoc?, doc?, usedModifiers, internalCalls, externalCalls, usingCalls, emittedEvents, inputParams, returnParams)
                for (const astFunc of astContract.vFunctions) {
                    const internalCalls = new Set<string>();
                    const externalCalls = new Set<string>();
                    const usingCalls = new Set<string>();

                    astFunc
                        .getChildrenByType(FunctionCall)
                        .forEach((funcCall) => {
                            if (
                                funcCall.vFunctionCallType ===
                                    ExternalReferenceType.UserDefined &&
                                funcCall.kind ===
                                    FunctionCallKind.FunctionCall &&
                                !(funcCall.parent instanceof EmitStatement)
                            ) {
                                const refDeclarationName = (
                                    funcCall.vReferencedDeclaration!
                                        .vScope as ContractDefinition
                                ).name;

                                const expr = funcCall.vExpression;
                                if (expr instanceof MemberAccess) {
                                    const baseType =
                                        expr.vExpression.typeString;

                                    if (
                                        baseType.includes("external") ||
                                        baseType.includes("contract")
                                    ) {
                                        // External
                                        externalCalls.add(
                                            `${refDeclarationName}.${funcCall.vFunctionName}`
                                        );
                                    } else if (
                                        baseType.includes("function") ||
                                        baseType.includes("internal")
                                    ) {
                                        // Internal
                                        internalCalls.add(
                                            `${refDeclarationName}.${funcCall.vFunctionName}`
                                        );
                                    } else {
                                        // Using
                                        const applicableLibs = Object.entries(
                                            usingMap
                                        )
                                            .filter(
                                                ([type]) =>
                                                    type === "all" ||
                                                    baseType.includes(type)
                                            )
                                            .flatMap(
                                                ([, libraries]) => libraries
                                            );

                                        applicableLibs.forEach((lib) =>
                                            usingCalls.add(
                                                `${lib}.${expr.memberName}`
                                            )
                                        );
                                    }
                                } else if (
                                    expr instanceof Identifier &&
                                    expr.typeString.includes("function")
                                ) {
                                    // Internal
                                    internalCalls.add(
                                        `${refDeclarationName}.${funcCall.vFunctionName}`
                                    );
                                }
                            }
                        });

                    contractMeta.functions.push({
                        name: astFunc.name,
                        code: this.getSourceCode(fileData, astFunc),
                        codeDoc: this.getCodeDoc(astFunc.documentation),
                        inputParams: astFunc.vParameters.vParameters.map(
                            (param) => ({
                                name: param.name,
                                code: this.getSourceCode(fileData, param),
                                typeString: param.typeString,
                                codeDoc: this.getCodeDoc(param.documentation),
                            })
                        ),
                        returnParams: astFunc.vReturnParameters.vParameters.map(
                            (param) => ({
                                name: param.name,
                                code: this.getSourceCode(fileData, param),
                                typeString: param.typeString,
                                codeDoc: this.getCodeDoc(param.documentation),
                            })
                        ),
                        usedModifiers: astFunc.vModifiers.map(
                            (m) =>
                                `${(m.vModifier.vScope as ContractDefinition).name}.${m.vModifier.name}`
                        ),
                        emittedEvents: astFunc
                            .getChildrenByType(EmitStatement)
                            .map(
                                (emit) =>
                                    `${(emit.vEventCall.vReferencedDeclaration!.vScope as ContractDefinition).name}.${emit.vEventCall.vFunctionName}`
                            ),
                        internalCalls: Array.from(internalCalls),
                        externalCalls: Array.from(externalCalls),
                        usingCalls: Array.from(usingCalls),
                    });
                }

                // Extract events(name, code, codeDoc?, doc?)
                for (const astEvent of astContract.vEvents) {
                    contractMeta.events.push({
                        name: astEvent.name,
                        code: this.getSourceCode(fileData, astEvent),
                        codeDoc: this.getCodeDoc(astEvent.documentation),
                    });
                }

                scope.contracts.push(contractMeta);
            }
        }

        return { success: true, return: scope };
    }

    public getContracts(contractNames: string[]): Result<ContractMeta[]> {
        const targetContracts = this.contracts.filter((contract) =>
            contractNames.includes(contract.name)
        );

        if (targetContracts.length !== contractNames.length) {
            return { success: false };
        }

        return { success: true, return: targetContracts };
    }
}

export class FileScopeExtractor {
    private files: Map<string, [string, string]>;

    private constructor() {
        this.files = new Map();
    }

    static async load(files: string[]): AsyncResult<FileScopeExtractor> {
        const scope = new FileScopeExtractor();

        try {
            for (const filePath of files) {
                const data = await readFile(filePath);
                const fileName = path.basename(filePath);

                scope.files.set(filePath, [fileName, data.toString()]);
            }

            return { success: true, return: scope };
        } catch (error: any) {
            // TODO: Catch errors
            console.error(error);

            return { success: false };
        }
    }

    public getFiles(): Map<string, [string, string]> {
        return this.files;
    }
}
