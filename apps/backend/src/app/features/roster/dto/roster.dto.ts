import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { RosterChange, SaveRosterRequest } from "@presqio/lib";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsISO8601, IsOptional, IsUUID, Matches, ValidateNested } from "class-validator";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class RosterQueryDto {
  @ApiProperty({ example: "2026-11-16" }) @Matches(DATE) @IsISO8601({ strict: true }) from!: string;
  @ApiProperty({ example: "2026-11-22" }) @Matches(DATE) @IsISO8601({ strict: true }) to!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
}

export class RosterChangeDto implements RosterChange {
  @IsUUID() employeeId!: string;
  @Matches(DATE) @IsISO8601({ strict: true }) date!: string;
  /** Up to three shifts (a split day). */
  @IsArray() @ArrayMaxSize(3) @IsUUID("all", { each: true }) shiftIds!: string[];
  @IsBoolean() off!: boolean;
}

export class SaveRosterDto implements SaveRosterRequest {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => RosterChangeDto)
  changes!: RosterChangeDto[];
}
