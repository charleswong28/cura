import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      lazyConnect: true,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async getUserVer(userId: string): Promise<number> {
    const val = await this.client.get(`user_ver:${userId}`);
    return val ? parseInt(val, 10) : 0;
  }

  /** SET NX — initialises the counter to 0 on first login only. */
  async initUserVer(userId: string): Promise<void> {
    await this.client.set(`user_ver:${userId}`, "0", "NX");
  }

  async incrUserVer(userId: string): Promise<number> {
    return this.client.incr(`user_ver:${userId}`);
  }

  /** Increment rate-limit counter with a 1-hour sliding window. Returns new count. */
  async incrementRateLimit(key: string, windowSecs = 3600): Promise<number> {
    const redisKey = `rate:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) await this.client.expire(redisKey, windowSecs);
    return count;
  }

  async setChallenge(token: string, data: object, ttlSecs: number): Promise<void> {
    await this.client.set(`challenge:${token}`, JSON.stringify(data), "EX", ttlSecs);
  }

  async getChallenge<T>(token: string): Promise<T | null> {
    const val = await this.client.get(`challenge:${token}`);
    return val ? (JSON.parse(val) as T) : null;
  }

  async updateChallenge(token: string, data: object, ttlSecs: number): Promise<void> {
    await this.client.set(`challenge:${token}`, JSON.stringify(data), "EX", ttlSecs);
  }

  async deleteChallenge(token: string): Promise<void> {
    await this.client.del(`challenge:${token}`);
  }
}
