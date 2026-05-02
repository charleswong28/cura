import { IsString } from "class-validator";

export class MfaEnrolConfirmDto {
  @IsString()
  totpCode!: string;
}
