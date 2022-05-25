import { Collection, Attribute } from './types';
/**
 * @returns Collection with rarity data
 */
export declare const analyse: (c: Array<Record<string, string | number | Attribute[]>> | {
    tokens: Array<Record<string, string | number | Attribute[]>>;
}) => Collection;
