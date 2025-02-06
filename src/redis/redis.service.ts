import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: +this.configService.get('REDIS_PORT'),
      username: this.configService.get('REDIS_USER'),
      password: this.configService.get('REDIS_PASS'),
    });
  }

  public async set(
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<void> {
    if (expireSeconds) {
      await this.redis.set(key, value, 'EX', expireSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async del(key: string): Promise<number> {
    return this.redis.del(key);
  }
}
