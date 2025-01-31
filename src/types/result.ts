export type ResultSuccess<T = undefined> = T extends undefined
    ? { success: true }
    : { success: true; return: T };

export type ResultError<E = undefined> = E extends undefined
    ? { success: false }
    : { success: false; error: E };

export type Result<T = undefined, E = undefined> =
    | ResultSuccess<T>
    | ResultError<E>;

export type AsyncResult<T = undefined, E = undefined> = Promise<Result<T, E>>;
