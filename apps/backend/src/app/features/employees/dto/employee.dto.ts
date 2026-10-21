import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
/** Blank optional text counts as "not provided". */
const trimOrUndefined = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;
const CODE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

export class CreateEmployeeDto implements CreateEmployeeRequest {
  @ApiProperty({ example: "Asha Rao" })
  @Transform(trim) @IsString() @Length(2, 80)
  fullName!: string;

  @ApiPropertyOptional({ example: "SGH0007", description: "Generated when omitted" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() || undefined : value))
  @Matches(CODE, { message: "code must be 2-20 letters, digits or dashes" })
  code?: string;

  @ApiPropertyOptional({ example: "+91 98765 43210" })
  @IsOptional() @Transform(trimOrUndefined) @Matches(PHONE, { message: "phone number looks invalid" })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @Transform(trimOrUndefined) @IsEmail() @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: "Front office executive" })
  @IsOptional() @Transform(trimOrUndefined) @IsString() @Length(2, 80)
  jobTitle?: string;

  @ApiProperty() @IsUUID() branchId!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() shiftId?: string;

  @ApiPropertyOptional({ example: "2026-10-21" })
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  joinedOn?: string;
}

export class UpdateEmployeeDto implements UpdateEmployeeRequest {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @Length(2, 80)
  fullName?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim)
  @ValidateIf((_, v) => v !== "") @Matches(PHONE, { message: "phone number looks invalid" })
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim)
  @ValidateIf((_, v) => v !== "") @IsEmail() @MaxLength(254)
  email?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim)
  @ValidateIf((_, v) => v !== "") @IsString() @Length(2, 80)
  jobTitle?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUUID()
  shiftId?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED", "TERMINATED"] })
  @IsOptional() @IsIn(["ACTIVE", "SUSPENDED", "TERMINATED"])
  accountStatus?: "ACTIVE" | "SUSPENDED" | "TERMINATED";
}
