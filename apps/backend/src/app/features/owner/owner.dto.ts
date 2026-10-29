import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";
import type { ClientState, SubscriptionStatusCode } from "@presqio/lib";

const STATES: ClientState[] = ["TRIAL", "TRIAL_ENDING", "TRIAL_EXPIRED", "PAYING", "PAYMENT_DUE", "CANCELED", "SUSPENDED"];
const SORTS = ["newest", "oldest", "name", "employees", "activity", "trialEnd"] as const;
const STATUSES: SubscriptionStatusCode[] = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"];

/** Dates must fall within five years, which catches typos like year 20260. */
const FIVE_YEARS_MS = 5 * 365 * 86_400_000;
const withinFiveYears = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const t = Date.parse(value);
  return Number.isFinite(t) && Math.abs(t - Date.now()) < FIVE_YEARS_MS ? value : "invalid";
};

export class ClientListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: STATES }) @IsOptional() @IsIn(STATES)
  state?: ClientState;

  @ApiPropertyOptional({ enum: SORTS }) @IsOptional() @IsIn(SORTS)
  sort?: (typeof SORTS)[number];

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100)
  pageSize?: number;
}

export class UpdateClientSubscriptionDto {
  @ApiPropertyOptional({ example: "GROWTH" }) @IsOptional() @IsString() @Length(2, 40)
  planCode?: string;

  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES)
  status?: SubscriptionStatusCode;

  @ApiPropertyOptional({ description: "End of the free trial (ISO date-time)" })
  @IsOptional() @Transform(withinFiveYears) @IsISO8601({ strict: true }, { message: "trialEndsAt must be a date within five years" })
  trialEndsAt?: string;

  @ApiPropertyOptional({ description: "Paid until (ISO date-time)" })
  @IsOptional() @Transform(withinFiveYears) @IsISO8601({ strict: true }, { message: "paidUntil must be a date within five years" })
  paidUntil?: string;
}

export class SuspendClientDto {
  @ApiPropertyOptional({ example: "Payment overdue" }) @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}
