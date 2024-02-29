










/**
 * 
 * describe a {@link Symbol.iterator re-iterable } `Iterable`, by the given `() => Generator<?>`.
 * 
 * @type {<E>(c: () => Generator<E, void, void> ) => Iterable<E> }
 */
export function reiterableBy(s) {
  return { [Symbol.iterator]: s, } ;
}

/**
 * 
 * @type {<E>(c: () => Generator<E, void, void> ) => Array<E> }
 */
export function arrayByGenerator(s) {
  return [...reiterableBy(s) ] ;
}









