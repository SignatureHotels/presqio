import { ApiProperty } from "@nestjs/swagger";
import type { EmployeeLoginRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

export class EmployeeLoginDto implements EmployeeLoginRequest {
  @ApiProperty({ example: "SGH0001" })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : value))
  @IsString()
  @Length(2, 20)
  employeeCode!: string;
}
