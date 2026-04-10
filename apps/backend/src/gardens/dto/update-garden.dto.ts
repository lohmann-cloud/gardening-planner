import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateGardenDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  lengthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  gridResolutionM?: number;
}
