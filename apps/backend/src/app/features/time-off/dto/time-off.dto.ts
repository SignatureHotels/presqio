import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateHolidayRequest, CreateLeaveTypeRequest, UpdateLeaveTypeRequest } from "@presqio/lib";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsISO8601, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateHolidayDto implements CreateHolidayRequest {
  @ApiProperty({ example: "2026-01-26" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" })
  @IsISO8601({ strict: true })
  date!: string;

  @ApiProperty({ example: "Republic Day" })
  @Transform(trim) @IsString() @Length(2, 60)
  name!: string;
}

export class CreateLeaveTypeDto implements CreateLeaveTypeRequest {
  @ApiProperty({ example: "Casual leave" })
  @Transform(trim) @IsString() @Length(2, 40)
  name!: string;

  @ApiProperty({ example: true }) @IsBoolean()
  paid!: boolean;

  @ApiProperty({ example: 12, nullable: true, description: "Days per employee per calendar year; null for no limit" })
  @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(366)
  daysPerYear!: number | null;
}

export class UpdateLeaveTypeDto implements UpdateLeaveTypeRequest {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @Length(2, 40)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  paid?: boolean;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(366)
  daysPerYear?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  archived?: boolean;
}

export class YearQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2099)
  year?: number;
}
