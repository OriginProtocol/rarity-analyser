"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyse = void 0;
const lodash_1 = require("lodash");
const rarityConfig_1 = __importDefault(require("../rarityConfig"));
const utils_1 = require("./utils");
const getMissingTraitIdentifier = rarityConfig_1.default.getMissingTraitIdentifier ?? utils_1.defaultMissingTraitIdentifier;
const weights = rarityConfig_1.default.weights ?? {};
const getWeight = (traitType) => weights[traitType] ?? 1;
const MISSING = 'none';
/**
 * @param missingTraitIdentifier  Value of the trait type that indicates that it is missing. `undefined` (default) if there is no specific identifier and the {trait_type: string, value: string} entry is simply omitted.
 * @returns A function, which given traitType and token returns true if the trait type is missing (as specified by missingTraitIdentifier). Returns true also if the given traitType is completely missing from the tokens attributes
 */
const getIsMissing = (getMissingTraitIdentifier) => (traitType, token) => {
    const attribute = token.attributes.find((att) => att.trait_type === traitType);
    return (!attribute || attribute.value === getMissingTraitIdentifier(traitType));
};
const traitIsMissingFn = getIsMissing(getMissingTraitIdentifier);
/**
 * @returns Collection with rarity data
 */
const analyse = (c) => {
    const tokens = preprocess('tokens' in c ? c.tokens : c);
    const n = tokens.length;
    let traitTypes = getTraitTypeSet(tokens);
    const tokensWithMissingTraits = addMissingTraits(tokens, traitIsMissingFn, traitTypes, getMissingTraitIdentifier);
    const tokensWithTraitCount = addTraitCounts(tokensWithMissingTraits, getMissingTraitIdentifier);
    traitTypes = getTraitTypeSet(tokensWithTraitCount);
    const counts = count(tokensWithTraitCount);
    const tokensWithAttributeRarity = addAttributeRarities(tokensWithTraitCount, counts);
    // Sort attributes by rarity_score
    const tokensWithOrderedAttributes = tokensWithAttributeRarity.map((token) => ({
        ...token,
        attributes: (0, lodash_1.orderBy)(token.attributes, (a) => a.rarity_score, 'desc'),
    }));
    const tokensWithTotalRarityScore = getTotalRarityScore(tokensWithOrderedAttributes);
    const tokensWithRankings = getRankings(tokensWithTotalRarityScore);
    const traitTypeData = getTraitRarityScores(tokensWithRankings, [...traitTypes]);
    const [traitTypeDataWithStats, collectionStats] = getStats(traitTypeData);
    const traitTypeDataWithNormalizedRarities = addNormalizedRarities(traitTypeDataWithStats, collectionStats.mean);
    const tokensWithNormalizedRarities = addTokenNormalizedRarities(tokensWithRankings, traitTypeDataWithNormalizedRarities);
    const tokensWithTotalNormalizedRarity = getTotalNormalizedRarityScore(tokensWithNormalizedRarities);
    const tokensWithNormalizedRankings = getNormalizedRankings(tokensWithTotalNormalizedRarity);
    return {
        tokens: tokensWithNormalizedRankings,
        numTokens: n,
        traitTypes: traitTypeDataWithNormalizedRarities,
        stats: collectionStats,
    };
};
exports.analyse = analyse;
const filterIgnored = (tokens, ignoredTraits) => tokens.map(token => ({
    ...token,
    attributes: token.attributes.filter(attribute => (!(ignoredTraits.includes(attribute.trait_type))))
}));
const preprocess = (tokens) => {
    const attributesFieldName = rarityConfig_1.default.attributesFieldName;
    // Filter possible empty objects, ie. trait_type and value are missing
    const filtered = tokens.map((token) => {
        const attributes = token[attributesFieldName ?? 'attributes'];
        if (!('trait_type' in attributes[0]))
            throw new Error('Attribute trait type missing');
        const filteredAttributes = attributes.filter((a) => Object.keys(a).length > 0);
        return { ...token, attributes: filteredAttributes };
    });
    let t = filtered;
    // If attribute field name is not 'attributes', rename the field
    if (attributesFieldName && attributesFieldName !== 'attributes') {
        const mapped = filtered.map((token) => {
            const attributes = token[attributesFieldName];
            if (!('trait_type' in attributes[0]))
                throw new Error('Attribute trait_type missing');
            const newToken = {
                ...token,
                attributes: attributes,
            };
            delete newToken[attributesFieldName];
            return newToken;
        });
        t = mapped;
    }
    let result;
    if (rarityConfig_1.default.ignoreTraits !== undefined)
        result = filterIgnored(t, rarityConfig_1.default.ignoreTraits);
    else
        result = t;
    return result;
};
/**
 * @param tokens
 * @param traitIsMissingFn Function that given a token and a trait type returns true if the trait type is missing
 * @param traitTypes A set of trait types
 * @param missingTraitIdentifier Value of a trait type that is missing or not active on the token. By default (undefined) it is assumed that the trait type is completely missing from the attribute list.
 * @returns
 */
const addMissingTraits = (tokens, traitIsMissingFn, traitTypes, getMissingTraitIdentifier) => tokens.map((token) => {
    const missingAttributes = getMissingTraits(token, traitIsMissingFn, traitTypes, getMissingTraitIdentifier);
    // Delete old missing attributes if exists
    const missingTraits = new Set(missingAttributes.map((m) => m.trait_type));
    const filteredAttributes = token.attributes.filter((a) => !missingTraits.has(a.trait_type));
    return {
        ...token,
        attributes: [...filteredAttributes, ...missingAttributes],
    };
});
/**
 * @returns Set of a tokens missing traits as attributes with placeholder rarity data
 */
const getMissingTraits = (token, isMissingFn, traitTypes, getMissingTraitIdentifier) => [...traitTypes]
    .filter((traitType) => isMissingFn(traitType, token))
    .map((trait_type) => ({
    trait_type,
    value: getMissingTraitIdentifier(trait_type) ?? MISSING,
    rarity_score: 0,
    count: 0,
    percentile: 0,
}));
/**
 * @returns tokens with trait_count attribute (`{trait_type: 'trait_count', value: number}`)
 */
const addTraitCounts = (tokens, getMissingTraitIdentifier) => tokens.map((token) => {
    const count = token.attributes.filter((a) => a.value !== (getMissingTraitIdentifier(a.trait_type) ?? MISSING)).length;
    const traitCountAttribute = {
        trait_type: 'Trait Count',
        value: String(count),
        rarity_score: 0,
        percentile: 0,
        count: 0,
    };
    return {
        ...token,
        attributes: [...token.attributes, traitCountAttribute],
    };
});
/**
 * @returns counts of how many times each different attribute value occurs in the collection
 */
const count = (tokens) => {
    const counts = {};
    tokens.forEach((token) => {
        token.attributes.forEach(({ trait_type, value }) => {
            const count = counts[trait_type] ? counts[trait_type][value] ?? 0 : 0;
            if (counts[trait_type])
                counts[trait_type][value] = count + 1;
            else
                counts[trait_type] = { [value]: 1 };
        });
    });
    return counts;
};
/**
 * @returns tokens with rarity_score, percentile. Include count (how many tokens have this value)
 */
const addAttributeRarities = (tokens, counts) => tokens.map((token) => {
    const updatedAttributes = token.attributes.map((attribute) => {
        const { trait_type, value } = attribute;
        const count = counts[trait_type][value];
        const percentile = count / tokens.length;
        const rarity_score = (1 / percentile) * getWeight(trait_type);
        return { ...attribute, rarity_score, percentile, count };
    });
    return { ...token, attributes: updatedAttributes };
});
/**
 * @returns set of different trait types in the collection
 */
const getTraitTypeSet = (tokens) => {
    const traitTypes = new Set();
    tokens.forEach((token) => {
        token.attributes.forEach(({ trait_type }) => {
            if (!traitTypes.has(trait_type))
                traitTypes.add(trait_type);
        });
    });
    return traitTypes;
};
const getTotalRarityScore = (tokens) => {
    const totalRarityScores = tokens.map((token) => {
        const rarity_score = token.attributes.reduce((sum, attribute) => sum + attribute.rarity_score, 0);
        return { ...token, rarity_score };
    });
    return totalRarityScores;
};
const getTotalNormalizedRarityScore = (tokens) => {
    const totalRarityScores = tokens.map((token) => {
        const rarity_score_normalized = token.attributes.reduce((sum, attribute) => {
            if (attribute.rarity_score_normalized === undefined)
                throw new Error("Normalized rarity score missing");
            return sum + attribute.rarity_score_normalized;
        }, 0);
        return { ...token, rarity_score_normalized };
    });
    return totalRarityScores;
};
/**
 * @param tokens Array of tokens sorted by rarity_score (desc)
 * @returns Tokens with rankins
 */
const getRankings = (tokens) => {
    const sorted = (0, lodash_1.orderBy)(tokens, (token) => token.rarity_score, 'desc');
    let currentRank = 0;
    let previousRarityScore = Infinity;
    const rankedTokens = sorted.map((token, i) => {
        if (token.rarity_score < previousRarityScore) {
            currentRank = i + 1;
        }
        const updated = { ...token, rank: currentRank };
        previousRarityScore = updated.rarity_score;
        return updated;
    });
    return rankedTokens;
};
/**
 * @param tokens Array of tokens sorted by rarity_score (desc)
 * @returns Tokens with rankins
 */
const getNormalizedRankings = (tokens) => {
    const sorted = (0, lodash_1.orderBy)(tokens, (token) => token.rarity_score_normalized, 'desc');
    let currentRank = 0;
    let previous = Infinity;
    const rankedTokens = sorted.map((token, i) => {
        if (token.rarity_score_normalized < previous) {
            currentRank = i + 1;
        }
        const updated = { ...token, rank_normalized: currentRank };
        previous = updated.rarity_score_normalized;
        return updated;
    });
    return rankedTokens;
};
const getTraitRarityScores = (tokens, traitTypes) => {
    const temp = {};
    traitTypes.forEach((t) => (temp[t] = {}));
    tokens.forEach((token) => {
        token.attributes.forEach((attribute) => {
            const { trait_type, rarity_score, value } = attribute;
            const attributes = temp[trait_type];
            if (!attributes)
                return;
            const current = attributes[value];
            if (!current || rarity_score > current.rarity_score) {
                temp[trait_type][value] = attribute;
            }
        });
    });
    const result = Object.entries(temp).map(([key, val]) => ({
        trait_type: key,
        attributes: (0, lodash_1.orderBy)(Object.entries(val).map((val) => val[1]), x => x.count),
    }));
    return result;
};
const getStats = (traitRarities) => {
    const dataWithStats = traitRarities.map((trait) => {
        const [sum, min, max] = trait.attributes
            .map((a) => a.rarity_score)
            .reduce(([sum, min, max], rarity_score) => [
            sum + rarity_score,
            Math.min(min, rarity_score),
            Math.max(max, rarity_score),
        ], [0, Number.MAX_VALUE, 0]);
        const mean = sum / trait.attributes.length;
        const temp = trait.attributes
            .map((a) => a.rarity_score)
            .reduce((acc, rarity) => acc + Math.pow(rarity - mean, 2));
        const std = Math.sqrt(temp / trait.attributes.length);
        return {
            ...trait,
            stats: { mean, std, min, max },
            numValues: trait.attributes.length,
        };
    });
    const [sum, min, max] = dataWithStats.reduce(([sum, min, max], trait) => {
        const s = trait.attributes.reduce((sum, attribute) => sum + attribute.rarity_score, 0);
        return [s, Math.min(min, trait.stats.min), Math.max(max, trait.stats.max)];
    }, [0, Number.MAX_VALUE, 0]);
    const mean = sum / dataWithStats.length;
    const temp = dataWithStats.reduce((acc, rarity) => acc +
        rarity.attributes.reduce((sum, a) => sum + Math.pow(a.rarity_score - mean, 2), 0), 0);
    const std = Math.sqrt(temp /
        dataWithStats.reduce((count, trait) => count + trait.attributes.length, 0));
    return [dataWithStats, { mean, std, min, max }];
};
/**
 * The idea with normalization is the following:
 * If a trait type has more possible values than an average type,it will generally get higher rarity scores only for that reason.
 * Example:
 *  If four values are equally distributed among 800 tokens, this trait will be add a rarity score of 4 to the token's total rarity.
 *  If there are 5 values, each trait will add 5.
 * Therefore the trait types with more values need to be scaled down.
 * However some traits types include rarer values than others
 * We will take into account by checking whether the average rarity of the trait type
 * is higher than the average rarity of the whole collection.
 * Example:
 *  Trait has 30% more traits than the average, but 40% higher average rarity
 *  -> 10% of the higher rarity is due to actual rarity and scaling down 30% would remove some of that
 *  Solution is to 1. remove and store 10%, 2. remove 30%, 3. add 10% back.
 */
const addNormalizedRarities = (traitTypes, meanRarity) => {
    const tempSum = traitTypes.reduce((sum, type) => sum + type.numValues, 0);
    const meanValueCount = tempSum / traitTypes.length;
    const attributesWithNormalizedRarities = traitTypes.map(metaTrait => {
        const { stats, numValues, attributes } = metaTrait;
        let a;
        if (stats.mean >= meanRarity)
            a = (stats.mean - meanRarity) / stats.mean;
        else
            a = (meanRarity - stats.mean) / meanRarity;
        let b;
        if (numValues >= meanValueCount)
            b = (numValues - meanValueCount) / numValues;
        else
            b = (meanValueCount - numValues) / meanValueCount;
        const c = numValues >= meanValueCount ? 1 - b : 1 + b;
        const updated = attributes.map(attribute => {
            const r = attribute.rarity_score;
            let rarity_score_normalized;
            if (a >= b && ((stats.mean > meanRarity && numValues > meanValueCount) || (stats.mean < meanRarity && numValues < meanValueCount)))
                rarity_score_normalized = (r - (a - b) * r) * c + (a - b) * r;
            else
                rarity_score_normalized = (r - a * r) * c + a * r;
            return {
                ...attribute,
                rarity_score_normalized
            };
        });
        return {
            ...metaTrait,
            attributes: updated
        };
    });
    return attributesWithNormalizedRarities;
};
const addTokenNormalizedRarities = (tokens, traitTypes) => {
    const normalizedMap = {};
    traitTypes.forEach(type => {
        type.attributes.forEach(({ trait_type, value, rarity_score_normalized }) => {
            if (rarity_score_normalized === undefined)
                throw new Error('Normalized rarity score missing');
            if (!normalizedMap[trait_type])
                normalizedMap[trait_type] = {};
            normalizedMap[trait_type][value] = rarity_score_normalized;
        });
    });
    return tokens.map(token => ({
        ...token,
        attributes: token.attributes.map(attribute => ({
            ...attribute,
            rarity_score_normalized: normalizedMap[attribute.trait_type][attribute.value]
        }))
    }));
};
//# sourceMappingURL=analysis.js.map