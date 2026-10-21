import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PartialType } from "@nestjs/swagger";
import type { CreateShiftRequest, UpdateShiftRequest, Weekday } from "@presqio/lib";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateShiftDto implements CreateShiftRequest {
  @ApiProperty({ example: "General shift" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString() @Length(2, 60)
  name!: string;

  @ApiProperty({ example: "09:00" }) @Matches(HH_MM, { message: "start must be HH:mm" }) start!: string;
  @ApiProperty({ example: "18:00" }) @Matches(HH_MM, { message: "end must be HH:mm" }) end!: string;

  @ApiPropertyOptional({ example: 10 }) @IsOptional() @IsInt() @Min(0) @Max(120)
  graceMinutes?: number;

  @ApiPropertyOptional({ example: 60 }) @IsOptional() @IsInt() @Min(0) @Max(240)
  breakMinutes?: number;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5, 6], description: "1 = Monday … 7 = Sunday" })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @ArrayUnique()
  @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  workingDays?: Weekday[];
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) implements UpdateShiftRequest {}
