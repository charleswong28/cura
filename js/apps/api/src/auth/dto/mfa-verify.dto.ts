import { IsString } from "class-validator";

export class MfaVerifyDto {
  @IsString()
  mfaChallengeToken!: string;

  @IsString()
  code!: string;
}
