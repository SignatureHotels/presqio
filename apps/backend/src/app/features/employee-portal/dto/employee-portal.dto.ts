import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateCorrectionRequestDto, StartAttemptRequest, SubmitAttemptRequest, TakeLeaveRequest } from "./types";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class StartAttemptDto implements StartAttemptRequest {
  @ApiProperty({ enum: ["CHECK_IN", "CHECK_OUT"] }) @IsIn(["CHECK_IN", "CHECK_OUT"])
  action!: "CHECK_IN" | "CHECK_OUT";

  @ApiProperty() @IsString() @Length(8, 64) @Matches(/^[A-Za-z0-9_-]+$/)
  idempotencyKey!: string;
}

export class SubmitAttemptDto implements SubmitAttemptRequest {
  @ApiProperty() @IsLatitude() latitude!: number;
  @ApiProperty() @IsLongitude() longitude!: number;
  @ApiProperty({ description: "GPS accuracy radius in metres" }) @IsNumber() @Min(0) @Max(10_000)
  accuracy!: number;
  @ApiProperty() @IsISO8601() capturedAt!: string;
  @ApiProperty({ description: "data:image/jpeg;base64,…" }) @IsString() @MaxLength(820_000)
  photo!: string;
}

export class CreateCorrectionDto implements CreateCorrectionRequestDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiPropertyOptional({ example: "09:00" }) @IsOptional() @Matches(HH_MM) requestedIn?: string;
  @ApiPropertyOptional({ example: "18:05" }) @IsOptional() @Matches(HH_MM) requestedOut?: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString() @Length(5, 500)
  reason!: string;
}

export class TakeLeaveDto implements TakeLeaveRequest {
  @ApiProperty({ example: "2026-10-24" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" })
  @IsISO8601({ strict: true })
  date!: string;

  @ApiPropertyOptional({ example: "Family function" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(200)
  reason?: string;
}
