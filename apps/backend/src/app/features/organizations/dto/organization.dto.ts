import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import type {
  BusinessType,
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

export const BUSINESS_TYPES: BusinessType[] = [
  "office", "retail", "restaurant", "clinic", "factory", "construction",
  "security", "school", "salon", "field", "other",
];

export class CreateOrganizationDto implements CreateOrganizationRequest {
  @ApiProperty() @Transform(trim) @IsString() @Length(2, 80) name!: string;
  @ApiPropertyOptional({ example: "IN" })
  @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  country?: string;
  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @IsOptional() @IsTimeZone()
  defaultTimezone?: string;
  @ApiPropertyOptional({ enum: BUSINESS_TYPES })
  @IsOptional() @IsIn(BUSINESS_TYPES)
  businessType?: BusinessType;
}

export class UpdateOrganizationDto implements UpdateOrganizationRequest {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @Length(2, 80)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  country?: string;
  @ApiPropertyOptional() @IsOptional() @IsTimeZone()
  defaultTimezone?: string;
  @ApiPropertyOptional({ enum: BUSINESS_TYPES })
  @IsOptional() @IsIn(BUSINESS_TYPES)
  businessType?: BusinessType;
  @ApiPropertyOptional({ enum: ONBOARDING_STEPS })
  @IsOptional() @IsIn(ONBOARDING_STEPS)
  onboardingStep?: OnboardingStep;
}

/** Older businesses may hold free-text industries; only known types are reported. */
export function asBusinessType(industry: string | null | undefined): BusinessType | null {
  return industry && (BUSINESS_TYPES as string[]).includes(industry) ? (industry as BusinessType) : null;
}
