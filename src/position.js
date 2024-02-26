// The Position object provides utility methods to manipulate
// the GPOS position table.

import { athrow } from './athrow.mjs';

import Layout from './layout.js';

// import Font from './font.js';
/** @typedef {import("./font.js").default } Font */

/**
 * @exports opentype.Position
 * @class
 * @extends Layout
 */
class Position extends Layout
{
    /** @param {Font} font */
    constructor(font) { super(font, 'gpos') ; }
}

/**
 * Init some data for faster and easier access later.
 */
Position.prototype.init = function() {
    const script = this.getDefaultScriptName();
    this.defaultKerningTables = this.getKerningTables(script);
};

/**
 * @typedef {KtOtfKerningLookupTable} XKerningLookupTable
 * 
 */

/**
 * Find a glyph pair in a list of lookup tables of type 2 and retrieve the xAdvance kerning value.
 *
 * @param {XKerningLookupTable[] } kerningLookups
 * @param {any[]["length"] } leftIndex - left glyph index
 * @param {any[]["length"] } rightIndex - right glyph index
 * @returns {number}
 */
Position.prototype.getKerningValue = function(kerningLookups, leftIndex, rightIndex) {
    for (const kl of kerningLookups )
    {
        const subtables = kl.subtables;
        for (const subtable of subtables )
        {
            const covIndex = this.getCoverageIndex(subtable.coverage, leftIndex);
            if (covIndex < 0) continue;
            switch (subtable.posFormat) {
                case 1: {
                    // Search Pair Adjustment Positioning Format 1
                    let pairSet = subtable.pairSets[covIndex] ?? athrow(`[Position] [getKerningValue] [pairSet] not found for ${covIndex } `) ;
                    for (let k = 0; k < pairSet.length; k++) {
                        let pair = pairSet[k];
                        if (pair.secondGlyph === rightIndex) {
                            return pair.value1 && pair.value1.xAdvance || 0;
                        }
                    }
                    break;      // left glyph found, not right glyph - try next subtable
                }
                case 2: {
                    // Search Pair Adjustment Positioning Format 2
                    const class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
                    const class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
                    const pair = subtable.classRecords[class1][class2];
                    return pair.value1 && pair.value1.xAdvance || 0;
                }
            }
        }
    }
    return 0;
};

/**
 * List all kerning lookup tables.
 *
 * @param {string} [script='DFLT'] - use font.position.getDefaultScriptName() for a better default value
 * @param {string} [language='dflt']
 * @return {{ value?: object[] }["value"]} The list of kerning lookup tables (may be empty), or undefined if there is no GPOS table (and we should use the kern table)
 */
Position.prototype.getKerningTables = function(script, language) {
    if (this.font.tables.gpos) {
        return this.getLookupTables(script, language, 'kern', 2);
    }
};

export default Position;
