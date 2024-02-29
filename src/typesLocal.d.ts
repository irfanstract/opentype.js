









/**
 * countable quantity ; arithmetically denoted as `N`.
 * 
 * {@link ReadonlyArray.length `ReadonlyArray<?>#length`}
 */
declare interface KtOtjsN extends KtOtjsQuant {
  isOtjsIntegral?: true ;
}

/**
 * arithmetically denoted as `I` or `Z`.
 */
declare interface KtOtjsI extends KtOtjsQuant {
  isOtjsIntegral?: true ;
}

/**
 * arithmetically denoted as `R`.
 */
declare interface KtOtjsQuant extends Number {
  isOtjsIntegral?: boolean ;
}




/**
 * {@link KtOtjsTransformMatrix2D}
 * 
 */
declare interface KtOtjsTransformMatrix2D
{
  readonly xScale: number ;
  readonly yScale: number ;
  readonly scale01: number ;
  readonly scale10: number ;
  readonly dx: number ;
  readonly dy: number ;
}











