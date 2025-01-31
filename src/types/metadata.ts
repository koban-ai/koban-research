export type DocMeta = {
    codeDoc?: string;
    doc?: string;
};

export type VariableMeta = {
    name: string;
    code: string;
    typeString: string;
} & DocMeta;

export type ModifierMeta = {
    name: string;
    code: string;
    emittedEvents: string[];
    internalCalls: string[];
    externalCalls: string[];
} & DocMeta;

export type FunctionMeta = {
    name: string;
    code: string;
    inputParams: VariableMeta[];
    returnParams: VariableMeta[];
    usedModifiers: string[];
    emittedEvents: string[];
    internalCalls: string[];
    externalCalls: string[];
    usingCalls: string[];
} & DocMeta;

export type EventMeta = {
    name: string;
    code: string;
} & DocMeta;

export type ContractMeta = {
    name: string;
    code: string;
    kind: string;
    derivedFromContracts: string[];
    globalVars: VariableMeta[];
    modifiers: ModifierMeta[];
    functions: FunctionMeta[];
    events: EventMeta[];
} & DocMeta;

export type MetaType =
    | "VariableMeta"
    | "ModifierMeta"
    | "FunctionMeta"
    | "EventMeta"
    | "ContractMeta";
