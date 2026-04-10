import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateBedDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  xM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  lengthM?: number;
}
