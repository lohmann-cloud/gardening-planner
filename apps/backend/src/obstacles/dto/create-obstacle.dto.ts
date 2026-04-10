import { IsString, IsNumber, Min } from 'class-validator';

export class CreateObstacleDto {
  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  xM: number;

  @IsNumber()
  @Min(0)
  yM: number;

  @IsNumber()
  @Min(0.1)
  widthM: number;

  @IsNumber()
  @Min(0.1)
  lengthM: number;
}
