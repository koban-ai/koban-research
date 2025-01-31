import {
    Index,
    Pinecone,
    type PineconeRecord,
} from "@pinecone-database/pinecone";
import OpenAI from "openai";
import type { ContractMeta } from "./types/metadata";
import type { AsyncResult } from "./types/result";

// TODO: Change API key
const PINECONE_API_KEY: string = "";
const PINECONE_INDEX: string = "koban-research";
const DB_BATCH_SIZE: number = 100;

export class VectorDbProcessor {
    private pc: Pinecone;
    public pcIndex: Index;
    private openai: OpenAI;

    constructor(openai: OpenAI) {
        this.pc = new Pinecone({ apiKey: PINECONE_API_KEY });
        this.pcIndex = this.pc.index(PINECONE_INDEX);
        this.openai = openai;
    }

    public async generateEmbedding(content: string): AsyncResult<number[]> {
        try {
            const resp = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: content,
            });

            return { success: true, return: resp.data[0].embedding };
        } catch (error) {
            console.error(error);

            // TODO: Catch errors
            return { success: false };
        }
    }

    public async generateEmbeddingsAndUpload(
        scopeData: ContractMeta[]
    ): AsyncResult {
        const vectors: PineconeRecord[] = [];

        // Generate vectors
        // TODO: Add more RAG elems(docs)
        for (const contractMeta of scopeData) {
            // Generate vectors for functions
            for (const func of contractMeta.functions) {
                const content = `
                    Contract: ${contractMeta.name}
                    Function: ${func.name}
                    Code: ${func.code}
                    Input params: ${func.inputParams.map((v) => v.code).join(", ")}
                    Return params: ${func.returnParams.map((v) => v.code).join(", ")}
                    Used modifiers: ${func.usedModifiers.join(", ")}
                    Emitted events: ${func.emittedEvents.join(", ")}
                    Internal calls: ${func.internalCalls.join(", ")}
                    External calls: ${func.externalCalls.join(", ")}
                    Calls via 'Using' directive: ${func.usingCalls.join(", ")}
                `;

                const embeddingResult = await this.generateEmbedding(content);
                if (!embeddingResult.success) {
                    return { success: false };
                }
                const embedding = embeddingResult.return;

                vectors.push({
                    id: `${contractMeta.name}:func:${func.name}`,
                    values: embedding,
                    metadata: {
                        contractName: contractMeta.name,
                        name: func.name,
                        code: func.code,
                        inputParams: func.inputParams.map((v) => v.code),
                        returnsParams: func.returnParams.map((v) => v.code),
                        usedModifiers: func.usedModifiers,
                        emittedEvents: func.emittedEvents,
                        internalCalls: func.internalCalls,
                        externalCalls: func.externalCalls,
                        usingCalls: func.usingCalls,
                    },
                });
            }

            // Generate vectors for modifiers
            for (const modifier of contractMeta.modifiers) {
                const content = `
                    Contract: ${contractMeta.name}
                    Modifier: ${modifier.name}
                    Code: ${modifier.code}
                    Emitted events: ${modifier.emittedEvents.join(", ")}
                    Internal calls: ${modifier.internalCalls.join(", ")}
                    External calls: ${modifier.externalCalls.join(", ")}
                `;

                const embeddingResult = await this.generateEmbedding(content);
                if (!embeddingResult.success) {
                    return { success: false };
                }
                const embedding = embeddingResult.return;

                vectors.push({
                    id: `${contractMeta.name}:modifier:${modifier.name}`,
                    values: embedding,
                    metadata: {
                        contractName: contractMeta.name,
                        name: modifier.name,
                        code: modifier.code,
                        emittedEvents: modifier.emittedEvents,
                        internalCalls: modifier.internalCalls,
                        externalCalls: modifier.externalCalls,
                    },
                });
            }

            // Generate vectors for events
            for (const event of contractMeta.events) {
                const content = `
                    Contract: ${contractMeta.name}
                    Event: ${event.name}
                    Code: ${event.code}
                `;

                const embeddingResult = await this.generateEmbedding(content);
                if (!embeddingResult.success) {
                    return { success: false };
                }
                const embedding = embeddingResult.return;

                vectors.push({
                    id: `${contractMeta.name}:event:${event.name}`,
                    values: embedding,
                    metadata: {
                        contractName: contractMeta.name,
                        name: event.name,
                        code: event.code,
                    },
                });
            }

            // Generate vectors for global vars
            for (const globalVar of contractMeta.globalVars) {
                const content = `
                    Contract: ${contractMeta.name}
                    Global variable: ${globalVar.name}
                    Code: ${globalVar.code}
                    Type: ${globalVar.typeString}
                `;

                const embeddingResult = await this.generateEmbedding(content);
                if (!embeddingResult.success) {
                    return { success: false };
                }
                const embedding = embeddingResult.return;

                vectors.push({
                    id: `${contractMeta.name}:globalvar:${globalVar.name}`,
                    values: embedding,
                    metadata: {
                        contractName: contractMeta.name,
                        name: globalVar.name,
                        code: globalVar.code,
                        typeString: globalVar.typeString,
                    },
                });
            }

            // Generate vectors for contract
            const content = `
                Contract: ${contractMeta.name}
                Kind: ${contractMeta.kind}
                Derived from: ${contractMeta.derivedFromContracts.join(", ")}
                Global vars: ${contractMeta.globalVars.map((gv) => gv.name).join(", ")}
                Defined modifiers: ${contractMeta.modifiers.map((dm) => dm.name).join(", ")}
                Defined functions: ${contractMeta.functions.map((df) => df.name).join(", ")}
                Defined events: ${contractMeta.events.map((de) => de.name).join(", ")}
            `;

            const embeddingResult = await this.generateEmbedding(content);
            if (!embeddingResult.success) {
                return { success: false };
            }
            const embedding = embeddingResult.return;

            vectors.push({
                id: `${contractMeta.name}:contract:${contractMeta.name}`,
                values: embedding,
                metadata: {
                    contractName: contractMeta.name,
                    name: contractMeta.name,
                    kind: contractMeta.kind,
                    derivedFromContracts: contractMeta.derivedFromContracts,
                    globalVars: contractMeta.globalVars.map((gv) => gv.name),
                    modifiers: contractMeta.modifiers.map((m) => m.name),
                    functions: contractMeta.functions.map((f) => f.name),
                    events: contractMeta.events.map((e) => e.name),
                },
            });
        }

        // Upload to vector DB
        for (let i = 0; i < vectors.length; i += DB_BATCH_SIZE) {
            const batch = vectors.slice(i, i + DB_BATCH_SIZE);
            await this.pcIndex.upsert(batch);
        }

        return { success: true };
    }
}
