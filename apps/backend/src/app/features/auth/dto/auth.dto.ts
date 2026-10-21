import { ApiProperty } from "@nestjs/swagger";
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "@presqio/lib";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, MaxLength } from "class-validator";
import { PASSWORD_MAX, PASSWORD_MIN } from "../password-policy";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;


export class RegisterDto implements RegisterRequest {
  @ApiProperty({ example: "Asha Rao" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  fullName!: string;

  @ApiProperty({ example: "asha@example.com" })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN })
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX)
  password!: string;

  @ApiProperty({ example: "Rao Hospitality Group" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  organizationName!: string;
}

export class LoginDto implements LoginRequest {
  @ApiProperty() @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @Length(1, PASSWORD_MAX) password!: string;
}

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @ApiProperty() @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
}

export class ResetPasswordDto implements ResetPasswordRequest {
  @ApiProperty() @IsString() @Length(20, 200) token!: string;
  @ApiProperty({ minLength: PASSWORD_MIN })
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX)
  password!: string;
}

export class VerifyEmailDto implements VerifyEmailRequest {
  @ApiProperty() @IsString() @Length(20, 200) token!: string;
}
