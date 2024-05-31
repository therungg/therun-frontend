export type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
    ? 1
    : 2
    ? true
    : X;

type Exact<T, U> = T extends U ? (U extends T ? T : never) : never;

// Define a utility type to compare the types of imported locales
type CompareLocales<T extends readonly any[]> = T extends [
    infer First,
    ...infer Rest,
]
    ? Rest extends [infer Second, ...infer Remaining]
        ? Exact<First, Second> extends never
            ? "Error: Not all locales are the same shape. Check the locale files."
            : CompareLocales<[Second, ...Remaining]>
        : true
    : true;

export type AreLocalesValid<T extends any[]> = Equal<CompareLocales<T>, true>;
