# Rarity analyser
Generates rarity data for an NFT collection.

Fork of [rarity-analyser](https://github.com/mikko-o/rarity-analyser) that doesn't use a DB or Filesystem

### Usage
Import and then call with the NFT's metadata as the arg
```typescript
import analyser from 'rarity-analyser'

analyser.analyse(metadata)
```

### Interfaces

##### Token

```typescript
interface Token {
  id: number
  name: string
  attributes: Attribute[] // Attribute field name can be configured in rarityConfig.ts
  image?: string
  description?: string
  image_data?: string
  external_url?: string
  animation_url?: string
  background_color?: string

  // The following fields are included in the analysed data
  rarity_score: number
  rank: number
  rarity_score_normalized: number
  rank_normalized: number
}
```

##### Attribute

```typescript
interface Attribute {
  trait_type: number
  value: string

  // The following fields are included in the analysed data
  rarity_score: number
  rarity_score_normalized: number
  percentile: number
  count: number // Count of how many tokens have the value of this attribute
}
```

### TODO
- Use Github Actions to build & publish package on push
- Get rid of global config file and make it an arg to the `analyse` function