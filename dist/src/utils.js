"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMissingTraitIdentifier = exports.getIsMissing = exports.getFileName = void 0;
const getFileName = (collectionName, postfix) => {
    return ((collectionName ?? 'collection').split(' ').join('') +
        (postfix ?? '') +
        '.json');
};
exports.getFileName = getFileName;
/**
 * @param traitType
 * @param token
 * @param missingTraitIdentifier  Value of the trait type that indicates that it is missing. `undefined` (default) if there is no specific identifier and the {trait_type: string, value: string} entry is simply omitted.
 * @returns true if the attribute is not found or if the value of the attribute is equal to the missingTraitIdentifier
 */
const getIsMissing = (missingTraitIdentifierFn) => (traitType, token) => {
    const attribute = token.attributes.find((att) => att.trait_type === traitType);
    return !attribute || attribute.value === missingTraitIdentifierFn(traitType);
};
exports.getIsMissing = getIsMissing;
const defaultMissingTraitIdentifier = () => undefined;
exports.defaultMissingTraitIdentifier = defaultMissingTraitIdentifier;
//# sourceMappingURL=utils.js.map