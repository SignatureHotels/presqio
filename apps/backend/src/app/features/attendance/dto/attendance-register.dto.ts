import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";

export class AttendanceRegisterDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true })
  to!: string;

  @IsOptional() @IsUUID()
  branchId?: string;

  @IsOptional() @IsString() @MaxLength(80)
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1;
}
