import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import type {
  CreateOrganizationRequest,
  OnboardingStep,
  UpdateOrganizationRequest,
} from "@presqio/lib";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  IsTimeZone,
  Length,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "ORGANIZATION",
  "BUSINESS",
  "BRANCH",
  "SHIFT",
  "TEAM",
  "COMPLETED",
];

export class CreateOrganizationDto implements CreateOrganizationRequest {
  @ApiProperty() @Transform(trim) @IsString() @Length(2, 80) name!: string;
  @ApiPropertyOptional({ example: "IN" })
  @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  country?: string;
  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @IsOptional() @IsTimeZone()
  defaultTimezone?: string;
}

export class UpdateOrganizationDto implements UpdateOrganizationRequest {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @Length(2, 80)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  country?: string;
  @ApiPropertyOptional() @IsOptional() @IsTimeZone()
  defaultTimezone?: string;
  @ApiPropertyOptional({ enum: ONBOARDING_STEPS })
  @IsOptional() @IsIn(ONBOARDING_STEPS)
  onboardingStep?: OnboardingStep;
}
