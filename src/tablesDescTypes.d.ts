/**
 * 
 * aliases to various `type`s within the package
 * 
 */

;











declare type KtOtjsTable = import("./table.js").Table ;

declare type KtOtjsAttribDesc0 = (ConstructorParameters<typeof import("./table.js").Table>[1] & {} )[number] ;

declare type KtOtjsAttribDesc = KtOtjsAttribDesc0 ;

// import { TableFieldDescriptorSubpartTypeAndValue } from "./table.js";

// declare type KtOtjsAttribDesc1 = (
//   KtOtjsAttribDesc0 & (
//     TableFieldDescriptorSubpartTypeAndValue<>
//   )
// ) ;

declare type KtOtjsAttribDescSupported = (
  KtOtjsAttribDesc
  & import("./table.js").TableFieldDescriptorSubpartTypeAndValue<import("./types.js").OtjsSupportedDataType, unknown >
) ;












