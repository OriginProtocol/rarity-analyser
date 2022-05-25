import { GetIsMissing } from './types';
export declare const getFileName: (collectionName: string | undefined, postfix?: string | undefined) => string;
/**
 * @param traitType
 * @param token
 * @param missingTraitIdentifier  Value of the trait type that indicates that it is missing. `undefined` (default) if there is no specific identifier and the {trait_type: string, value: string} entry is simply omitted.
 * @returns true if the attribute is not found or if the value of the attribute is equal to the missingTraitIdentifier
 */
export declare const getIsMissing: GetIsMissing;
export declare const defaultMissingTraitIdentifier: () => undefined;
