import { ApiProperty } from "@nestjs/swagger";
import type { DecideCorrectionRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import { IsIn, IsString, Length } from "class-validator";

export class DecideCorrectionDto implements DecideCorrectionRequest {
  @ApiProperty({ enum: ["Approved", "Rejected"] })
  @IsIn(["Approved", "Rejected"])
  decision!: "Approved" | "Rejected";

  @ApiProperty({ description: "Why the request was approved or rejected (kept in the audit trail)" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(3, 500)
  reason!: string;
}
