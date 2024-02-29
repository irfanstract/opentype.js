








/**
 * 
 * `throw` `new` `TypeError` with (exact) given args.
 * 
 * @type {<V>(...args: Parameters<typeof TypeError> ) => never }
 */
export const athrow = /** @satisfies {<V>(...args: Parameters<typeof TypeError> ) => V } */ ((...args) => {
  throw new TypeError(...args) ;
} ) ;

/**
 * 
 * `throw` `new` non-`TypeError` exception with (exact) given args.
 * 
 * @type {<V>(...args: [message?: string | undefined, options?: ErrorOptions | undefined] ) => never }
 */
export const assertionFail = /** @satisfies {<V>(...args: Parameters<typeof TypeError> ) => V } */ ((...[msg = `assertion failed` , options]) => {
  throw new Error(...[msg, options]) ;
} ) ;



/** @type {<T>(a: T) => asserts a is (T & {}) } */
export function asNonNull(value ) {
  value ?? athrow(`is ${value }`) ;
}



/** typed string concat 2 */ export const strConcatOf2 = /** @satisfies {<const v1 extends string | number, const v2 extends string | number | boolean | null,                                             >(v1: v1, v2: v2,        ) => {} } */  ((v1, v2,    ) => /** @type {const} */ (`${v1}${v2}`      )) ;
/** typed string concat 3 */ export const strConcatOf3 = /** @satisfies {<const v1 extends string | number, const v2 extends string | number | boolean | null, const v3 extends string | number | Boolean, >(v1: v1, v2: v2, v3: v3,) => {} } */  ((v1, v2, v3,) => /** @type {const} */ (`${v1}${v2}${v3}` )) ;



export const throwMissingConfigItemError = /** @param {string} v */ (v) => athrow(`missing '${v}'`) ;

;







// export default athrow ;






