import { IsOptional } from 'class-validator';

export class CreateHighAbrasionDto {
  @IsOptional()
  gE63?: string;
  @IsOptional()
  materialID?: string;
  @IsOptional()
  vendorCode?: string;
  @IsOptional()
  supplier?: string;
  @IsOptional()
  supplierMaterialID?: string;
  @IsOptional()
  supplierMaterialName?: string;
  @IsOptional()
  mtlSuppLifecycleState?: string;
  @IsOptional()
  materialTypeLevel1?: string;
  @IsOptional()
  composition?: string;
  @IsOptional()
  classification?: string;
  @IsOptional()
  materialThickness?: string;
  @IsOptional()
  materialThicknessUOM?: string;
  @IsOptional()
  comparisonUOM?: string;
  @IsOptional()
  priceRemark?: string;
  @IsOptional()
  skinSize?: string;
  @IsOptional()
  qCPercent?: string;
  @IsOptional()
  leadtime?: string;
  @IsOptional()
  sampleLeadtime?: string;
  @IsOptional()
  minQtyColor?: string;
  @IsOptional()
  minQtySample?: string;
  @IsOptional()
  productionLocation?: string;
  @IsOptional()
  termsofDeliveryperT1Country?: string;
  @IsOptional()
  validFromPrice?: string;
  @IsOptional()
  validToPrice?: string;
  @IsOptional()
  priceType?: string;
  @IsOptional()
  colorCodePrice?: string;
  @IsOptional()
  colorPrice?: string;
  @IsOptional()
  treatmentPrice?: string;
  @IsOptional()
  widthPrice?: string;
  @IsOptional()
  widthUomPrice?: string;
  @IsOptional()
  lengthPrice?: string;
  @IsOptional()
  lengthUomPrice?: string;
  @IsOptional()
  thicknessPrice?: string;
  @IsOptional()
  thicknessUomPrice?: string;
  @IsOptional()
  diameterInsidePrice?: string;
  @IsOptional()
  diameterInsideUomPrice?: string;
  @IsOptional()
  weightPrice?: string;
  @IsOptional()
  weightUomPrice?: string;
  @IsOptional()
  quantityPrice?: string;
  @IsOptional()
  quantityUomPrice?: string;
  @IsOptional()
  uomStringPrice?: string;
  @IsOptional()
  sS26FinalPriceUSD?: string;
  @IsOptional()
  comparisonPricePriceUSD?: string;
  @IsOptional()
  approvedAsFinalPriceYNPrice?: string;
  @IsOptional()
  season?: string;
}
