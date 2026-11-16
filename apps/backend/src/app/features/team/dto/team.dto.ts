import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { InvitableAccess, InviteRequest, UpdateMemberRequest } from "@presqio/lib";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from "class-validator";

const ACCESS: InvitableAccess[] = ["ADMIN", "MANAGER", "VIEWER"];

export class InviteDto implements InviteRequest {
  @ApiProperty() @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ enum: ACCESS }) @IsIn(ACCESS) access!: InvitableAccess;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID("all", { each: true }) branchIds?: string[];
}

export class UpdateMemberDto implements UpdateMemberRequest {
  @ApiProperty({ enum: ACCESS }) @IsIn(ACCESS) access!: InvitableAccess;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID("all", { each: true }) branchIds?: string[];
}

export class InvitationTokenDto {
  @ApiProperty() @IsString() @Length(20, 200) token!: string;
}
