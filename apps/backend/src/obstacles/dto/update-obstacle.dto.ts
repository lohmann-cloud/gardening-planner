import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateObstacleDto {
  @IsOptional()
  @IsString()
  label?: string;

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
  @Min(0.1)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  lengthM?: number;
}
