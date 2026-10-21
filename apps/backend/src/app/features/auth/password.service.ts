import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id baseline: 19 MiB, 2 iterations, 1 lane.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

@Injectable()
export class PasswordService {
  /** Verified against when the account does not exist, so response time does not reveal it. */
  private readonly dummyHash = hash("presqio-timing-equalizer", OPTIONS);

  hash(password: string) {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string | null | undefined, password: string) {
    try {
      return await verify(passwordHash ?? (await this.dummyHash), password);
    } catch {
      return false;
    }
  }
}
