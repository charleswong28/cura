// In-memory Redis mock for unit tests. We replace the entire ioredis module
// before RedisService is imported so onModuleInit gets a controllable client.
const fakeRedisInstance = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue("OK"),
  incr: jest.fn(),
  expire: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue("OK"),
};

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn(() => fakeRedisInstance),
}));

import { RedisService } from "./redis.service";

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    Object.values(fakeRedisInstance).forEach((fn) => (fn as jest.Mock).mockClear());
    fakeRedisInstance.get.mockResolvedValue(null);
    fakeRedisInstance.set.mockResolvedValue("OK");
    fakeRedisInstance.incr.mockResolvedValue(1);
    fakeRedisInstance.expire.mockResolvedValue(1);
    fakeRedisInstance.del.mockResolvedValue(1);
    service = new RedisService();
    service.onModuleInit();
  });

  // ── user_ver ──────────────────────────────────────────────────────────────

  describe("getUserVer", () => {
    it("returns 0 when the key does not exist", async () => {
      expect(await service.getUserVer("u1")).toBe(0);
      expect(fakeRedisInstance.get).toHaveBeenCalledWith("user_ver:u1");
    });

    it("parses the stored string into an integer", async () => {
      fakeRedisInstance.get.mockResolvedValueOnce("17");
      expect(await service.getUserVer("u1")).toBe(17);
    });
  });

  describe("initUserVer", () => {
    it("uses SET NX so it does not clobber an existing version", async () => {
      await service.initUserVer("u1");
      expect(fakeRedisInstance.set).toHaveBeenCalledWith("user_ver:u1", "0", "NX");
    });
  });

  describe("incrUserVer", () => {
    it("increments and returns the new counter value", async () => {
      fakeRedisInstance.incr.mockResolvedValueOnce(4);
      expect(await service.incrUserVer("u1")).toBe(4);
      expect(fakeRedisInstance.incr).toHaveBeenCalledWith("user_ver:u1");
    });
  });

  // ── rate limit ────────────────────────────────────────────────────────────

  describe("incrementRateLimit", () => {
    it("sets the TTL only on the first call (count === 1)", async () => {
      fakeRedisInstance.incr.mockResolvedValueOnce(1);
      const count = await service.incrementRateLimit("pw_reset:u@x.com");
      expect(count).toBe(1);
      expect(fakeRedisInstance.incr).toHaveBeenCalledWith("rate:pw_reset:u@x.com");
      expect(fakeRedisInstance.expire).toHaveBeenCalledWith("rate:pw_reset:u@x.com", 3600);
    });

    it("does not re-arm the TTL on subsequent calls within the window", async () => {
      fakeRedisInstance.incr.mockResolvedValueOnce(2);
      const count = await service.incrementRateLimit("pw_reset:u@x.com");
      expect(count).toBe(2);
      expect(fakeRedisInstance.expire).not.toHaveBeenCalled();
    });

    it("respects a custom window in seconds", async () => {
      fakeRedisInstance.incr.mockResolvedValueOnce(1);
      await service.incrementRateLimit("login:u@x.com", 60);
      expect(fakeRedisInstance.expire).toHaveBeenCalledWith("rate:login:u@x.com", 60);
    });
  });

  // ── challenges ────────────────────────────────────────────────────────────

  describe("setChallenge / getChallenge", () => {
    it("serialises the payload to JSON with EX TTL", async () => {
      await service.setChallenge("tok_1", { authIdentityId: "ai_1" }, 300);
      expect(fakeRedisInstance.set).toHaveBeenCalledWith(
        "challenge:tok_1",
        JSON.stringify({ authIdentityId: "ai_1" }),
        "EX",
        300
      );
    });

    it("returns null when the challenge is missing", async () => {
      expect(await service.getChallenge<unknown>("tok_1")).toBeNull();
    });

    it("parses the JSON payload back into an object", async () => {
      fakeRedisInstance.get.mockResolvedValueOnce('{"authIdentityId":"ai_1","fails":2}');
      const data = await service.getChallenge<{ authIdentityId: string; fails: number }>("tok");
      expect(data).toEqual({ authIdentityId: "ai_1", fails: 2 });
    });
  });

  describe("updateChallenge", () => {
    it("re-writes the JSON payload with a fresh EX TTL", async () => {
      await service.updateChallenge("tok", { fails: 1 }, 120);
      expect(fakeRedisInstance.set).toHaveBeenCalledWith(
        "challenge:tok",
        JSON.stringify({ fails: 1 }),
        "EX",
        120
      );
    });
  });

  describe("deleteChallenge", () => {
    it("calls DEL with the namespaced key", async () => {
      await service.deleteChallenge("tok");
      expect(fakeRedisInstance.del).toHaveBeenCalledWith("challenge:tok");
    });
  });

  // ── lifecycle ─────────────────────────────────────────────────────────────

  describe("onModuleDestroy", () => {
    it("calls quit() on the underlying client", async () => {
      await service.onModuleDestroy();
      expect(fakeRedisInstance.quit).toHaveBeenCalled();
    });
  });
});
