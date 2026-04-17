import { eq, lt } from "drizzle-orm";
import { db } from "../database";
import { cooldowns } from "../database/schemas/cooldowns";

export class CooldownService {
	static async setCooldown(userId: string, key: string, seconds: number) {
		const expiresAt = new Date(Date.now() + seconds * 1000);
		const id = `${userId}:${key}`;

		await db
			.insert(cooldowns)
			.values({
				id,
				userId,
				key,
				expiresAt,
			})
			.onConflictDoUpdate({
				target: cooldowns.id,
				set: { expiresAt },
			});
	}

	static async getCooldown(userId: string, key: string) {
		const id = `${userId}:${key}`;
		const result = await db
			.select()
			.from(cooldowns)
			.where(eq(cooldowns.id, id))
			.limit(1);

		if (result.length === 0) return null;

		const cooldown = result[0];
		if (!cooldown || cooldown.expiresAt < new Date()) {
			await CooldownService.deleteCooldown(userId, key);
			return null;
		}

		return cooldown;
	}

	static async deleteCooldown(userId: string, key: string) {
		const id = `${userId}:${key}`;
		await db.delete(cooldowns).where(eq(cooldowns.id, id));
	}

	static async cleanup() {
		await db.delete(cooldowns).where(lt(cooldowns.expiresAt, new Date()));
	}
}
