import { IsString, IsInt, Min, MaxLength, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchInstrumentDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\s.]+$/, {
    message: 'La búsqueda solo puede contener letras, números, espacios y puntos',
  })
  @Transform(({ value }) => value.trim())
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
} 