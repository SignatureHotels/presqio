import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PartialType } from "@nestjs/swagger";
import type { CreateBranchRequest, UpdateBranchRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateBranchDto implements CreateBranchRequest {
  @ApiProperty({ example: "Indiranagar" })
  @Transform(trim) @IsString() @Length(2, 80)
  name!: string;

  @ApiPropertyOptional({ example: "IND" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{2,10}$/, { message: "code must be 2-10 letters or digits" })
  code?: string;

  @ApiPropertyOptional()
  // An empty address means "no address" (lets an edit clear it).
  @IsOptional() @Transform(trim) @ValidateIf((_, v) => v !== "") @IsString() @Length(2, 300)
  address?: string;

  @ApiProperty({ example: 12.9719 }) @IsLatitude() latitude!: number;
  @ApiProperty({ example: 77.6412 }) @IsLongitude() longitude!: number;

  @ApiProperty({ example: 100, description: "Perimeter radius in metres (20-2000)" })
  @IsNumber() @Min(20) @Max(2000)
  radius!: number;

  @ApiProperty({ example: 50, description: "Maximum accepted GPS accuracy in metres (5-500)" })
  @IsNumber() @Min(5) @Max(500)
  maxAccuracy!: number;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) implements UpdateBranchRequest {}
