








/**
 * 
 * `throw` exception as given - `TypeError` with (exact) given args.
 * 
 * @type {<V>(...args: Parameters<typeof TypeError> ) => never }
 */
export const athrow = /** @satisfies {<V>(...args: Parameters<typeof TypeError> ) => V } */ ((...args) => {
  throw new TypeError(...args) ;
} ) ;



/** @type {<T>(a: T) => asserts a is (T & {}) } */
export function anonnull(value ) {
  value ?? athrow(`is ${value }`) ;
}






// export default athrow ;






