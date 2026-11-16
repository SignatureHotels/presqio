import { Type, Transform } from 'class-transformer';
import type { PayBasis } from '@presqio/lib';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

export class PayrollLineDto {
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 80) label!: string;
  @IsInt() @Min(0) @Max(100_000_000_000) amount!: number;
}
const trim = ({value}:{value:unknown}) => typeof value === 'string' ? value.trim() : value;
const upper = ({value}:{value:unknown}) => typeof value === 'string' ? value.trim().toUpperCase() : value;
const OPTIONAL_DATE = /^(?:\d{4}-\d{2}-\d{2})?$/;
export class PayrollProfileDto {
  @Transform(trim) @IsString() @MaxLength(80) department!: string;
  @IsString() @Matches(OPTIONAL_DATE) dateOfBirth!: string;
  @Transform(upper) @IsString() @Matches(/^(?:[A-Z]{5}[0-9]{4}[A-Z])?$/, {message:'PAN must look like ABCDE1234F'}) pan!: string;
  @Transform(trim) @IsString() @Matches(/^(?:\d{12})?$/, {message:'PF UAN must be 12 digits'}) uan!: string;
  @Transform(trim) @IsString() @Matches(/^(?:\d{10}|\d{17})?$/, {message:'ESI number must be 10 or 17 digits'}) esi!: string;
  @Transform(trim) @IsString() @MaxLength(100) bankName!: string;
  @Transform(trim) @IsString() @Matches(/^(?:\d{6,20})?$/, {message:'Bank account number must be 6-20 digits'}) bankAccount!: string;
  @Transform(upper) @IsString() @Matches(/^(?:[A-Z]{4}0[A-Z0-9]{6})?$/, {message:'IFSC must look like HDFC0001234'}) bankIfsc!: string;
  @Transform(trim) @IsString() @MaxLength(100) bankBranch!: string;
  @IsString() @Matches(OPTIONAL_DATE) lastWorkingDate!: string;
}
export class PayrollSalaryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) effectiveMonth!: string;
  /** Daily and hourly wages may have no other earnings; a monthly salary needs at least one (checked when saving). */
  @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(() => PayrollLineDto) earnings!: PayrollLineDto[];
  @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(() => PayrollLineDto) deductions!: PayrollLineDto[];
  @IsOptional() @IsIn(['MONTHLY','DAILY','HOURLY']) payBasis?: PayBasis;
  /** Paise per day or hour. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1) @Max(100_000_000_000) rate?: number | null;
  @IsOptional() @IsInt() @Min(60) @Max(1440) standardDayMinutes?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(100) @Max(300) overtimePercent?: number | null;
}
export class SaveCompensationDto extends PayrollSalaryDto {
  @IsUUID() employeeId!: string;
}
/** Sent with an employee create/update by organization owners/admins. */
export class EmployeePayrollDto {
  @IsDefined() @ValidateNested() @Type(() => PayrollProfileDto) profile!: PayrollProfileDto;
  @IsOptional() @ValidateNested() @Type(() => PayrollSalaryDto) salary?: PayrollSalaryDto;
}
export class PayrollPeriodDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string;
}
export class PayrollMonthDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
}
export class PayrollReviewDto {
  @IsBoolean() acceptAttendanceExceptions!: boolean;
  @IsInt() @Min(0) @Max(62) lopHalfDays!: number;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({each:true}) @Type(() => PayrollLineDto) additionalEarnings!: PayrollLineDto[];
  @IsArray() @ArrayMaxSize(10) @ValidateNested({each:true}) @Type(() => PayrollLineDto) additionalDeductions!: PayrollLineDto[];
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(5, 1000) note!: string;
  /** Overtime to pay instead of what attendance shows; null or absent uses attendance. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(20_000) overtimeMinutes?: number | null;
}
export class PayrollApproveDto {
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(5, 1000) note!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @IsUUID('all',{each:true}) itemIds?: string[];
}
export class PayrollBulkPaymentDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @IsUUID('all',{each:true}) itemIds!: string[];
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 120) reference!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) paidOn!: string;
}
export class PayrollLogoDto {
  /** data:image/png|jpeg|webp;base64,… up to 500 KB. */
  @IsString() @MaxLength(700_000) dataUrl!: string;
}
export class PayrollSettingsDto {
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 160) legalName!: string;
  @IsString() @MaxLength(1000) address!: string;
  /** An uploaded logo's id (`<uuid>.<ext>`, stored in B2), a legacy HTTPS URL, or '' for none. */
  @IsString() @MaxLength(1000) @Matches(/^(?:|https:\/\/\S+|[0-9a-f-]{36}\.(?:png|jpg|webp))$/, {message:'Upload the logo again.'}) logoUrl!: string;
}
export class PayrollPaymentDto {
  @IsInt() @Min(1) @Max(100_000_000_000) amount!: number;
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 120) reference!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) paidOn!: string;
}
