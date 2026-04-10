import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateGardenDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.5)
  widthM: number;

  @IsNumber()
  @Min(0.5)
  lengthM: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  gridResolutionM?: number;
}
