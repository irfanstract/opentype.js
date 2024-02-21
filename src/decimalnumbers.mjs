

import { athrow, asNonNull } from "./athrow.mjs";







/**
 * 
 * @type {Record<number, Record<number, number | string> > }
 */
const decimalRoundingCache = {};

/**
 * 
 * @type {(...args: Parameters<{ (...args: [receiver: number, arg: number ] ): void ; }> ) => number }
 */
function roundDecimal(...[float, places]) {
    const integerPart = Math.floor(float);
    const decimalPart = float - integerPart;

    const dc1 = decimalRoundingCache[places] ??= {} ;

    if (dc1[decimalPart] !== undefined) {
        const roundedDecimalPart = dc1[decimalPart] ?? athrow(`[roundDecimal] assertion failed`) ;
        return (
          // @ts-ignore
          integerPart + roundedDecimalPart
        );
    }
    
    const roundedDecimalPart = +(Math.round(+(decimalPart + 'e+' + places ) ) + 'e-' + places);
    dc1[decimalPart] = roundedDecimalPart;

    return integerPart + roundedDecimalPart;
}




export { roundDecimal } ;







