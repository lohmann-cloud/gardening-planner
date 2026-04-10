import { IsString, IsNumber, Min } from 'class-validator';

export class CreateBedDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  xM: number;

  @IsNumber()
  @Min(0)
  yM: number;

  @IsNumber()
  @Min(0.5)
  widthM: number;

  @IsNumber()
  @Min(0.5)
  lengthM: number;
}
