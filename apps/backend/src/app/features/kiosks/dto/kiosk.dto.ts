import { ApiProperty } from "@nestjs/swagger";
import type { CreateKioskRequest, KioskLookupRequest, KioskPairRequest, KioskPunchRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import { IsIn, IsString, IsUUID, Length, Matches, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const code = ({ value }: { value: unknown }) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : value);

export class CreateKioskDto implements CreateKioskRequest {
  @ApiProperty({ example: "Front desk tablet" }) @Transform(trim) @IsString() @Length(2, 60) name!: string;
  @ApiProperty() @IsUUID() branchId!: string;
}

export class KioskPairDto implements KioskPairRequest {
  /** Shown as XXXX-XXXX; dashes and spaces are ignored. */
  @ApiProperty({ example: "K7PM-3QXD" })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/[\s-]+/g, "").toUpperCase() : value))
  @Matches(/^[A-Z0-9]{8}$/, { message: "Enter the 8-character code from the admin screen." })
  code!: string;
}

export class KioskLookupDto implements KioskLookupRequest {
  @ApiProperty({ example: "SGH0001" }) @Transform(code) @IsString() @Length(2, 20) employeeCode!: string;
}

export class KioskPunchDto extends KioskLookupDto implements KioskPunchRequest {
  @IsIn(["CHECK_IN", "CHECK_OUT"]) action!: "CHECK_IN" | "CHECK_OUT";
  @IsString() @MaxLength(1_000_000) photo!: string;
  @IsString() @Length(8, 100) idempotencyKey!: string;
}
