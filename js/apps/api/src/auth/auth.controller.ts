import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { Public } from "./auth.decorators";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { MfaEnrolConfirmDto } from "./dto/mfa-enrol-confirm.dto";
import { MfaVerifyDto } from "./dto/mfa-verify.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService
  ) {}

  /** Login — returns session tokens or an MFA challenge. */
  @Post("login")
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto.email,
      dto.password,
      dto.tenantSlug,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Refresh — rotates the refresh token and issues a new access token. */
  @Post("refresh")
  @Public()
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  /** Logout — revokes the current session. */
  @Post("logout")
  @Public()
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }

  /** Logout-all — revokes every active session for the user. */
  @Post("logout-all")
  @Public()
  async logoutAll(@Body() dto: LogoutDto) {
    await this.authService.logoutAll(dto.refreshToken);
    return { success: true };
  }

  /** Request a password-reset link (rate-limited, always returns 200). */
  @Post("password-reset/request")
  @Public()
  async passwordResetRequest(@Body() dto: PasswordResetRequestDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { success: true };
  }

  /** Confirm a password reset with the token from the email link. */
  @Post("password-reset/confirm")
  @Public()
  async passwordResetConfirm(@Body() dto: PasswordResetConfirmDto) {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword);
    return { success: true };
  }

  /** Verify a TOTP code (or backup code) to complete an MFA-gated login. */
  @Post("mfa/verify")
  @Public()
  async mfaVerify(@Body() dto: MfaVerifyDto, @Req() req: Request) {
    return this.authService.completeMfaLogin(
      dto.mfaChallengeToken,
      dto.code,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /**
   * Start TOTP enrolment — returns an otpauth URI for QR code display.
   * Requires an authenticated user (Story 2.4 will enforce this via JwtAuthCRard).
   * Accepts the userId in the body temporarily until the JWT guard is live.
   */
  @Post("mfa/enrol/start")
  @Public()
  async mfaEnrolStart(@Body() body: { userId: string; email: string }) {
    return this.mfaService.startEnrol(body.userId, body.email);
  }

  /**
   * Confirm TOTP enrolment — validates a code, saves the device, and returns backup codes.
   * Returns backup codes once — they must be saved by the user immediately.
   */
  @Post("mfa/enrol/confirm")
  @Public()
  async mfaEnrolConfirm(@Body() body: MfaEnrolConfirmDto & { authIdentityId: string }) {
    const backupCodes = await this.mfaService.confirmEnrol(body.authIdentityId, body.totpCode);
    return { backupCodes };
  }
}
