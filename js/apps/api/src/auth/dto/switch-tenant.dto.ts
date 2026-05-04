import { IsString } from "class-validator";

export class SwitchTenantDto {
  @IsString()
  refreshToken!: string;

  @IsString()
  tenantSlug!: string;
}
