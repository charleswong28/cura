import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Public } from "../auth";
import { WaitlistService } from "./waitlist.service";

class JoinWaitlistDto {
  email!: string;
}

@Public()
@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(201)
  async join(@Body() dto: JoinWaitlistDto): Promise<{ ok: boolean }> {
    await this.waitlistService.addEmail(dto.email);
    return { ok: true };
  }
}
