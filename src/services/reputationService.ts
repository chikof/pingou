import type { UsingClient } from "seyfert";
import { CONFIG } from "../config/config";
import { reputationRepository } from "../repositories/reputationRepository";
import { Embeds } from "../utils/embeds";

export interface CreateRepLogI {
	receiverId: string;
	receiverName: string;
	giverId: string;
	giverName: string;
	points: number;
	newRoles: string[];
}

export class ReputationService {
	async addRepAndCheckRoles(
		client: UsingClient,
		guildId: string,
		receiverId: string,
		giverId: string,
		amount = 1,
		reason = "ayuda",
	): Promise<{ points: number; prevPoints: number; newRoles: string[] }> {
		const prevPoints = await reputationRepository.getReputation(receiverId);
		const points = await reputationRepository.addReputation(
			receiverId,
			giverId,
			amount,
			reason,
		);
		const newRoles: string[] = [];

		for (const { minPoints, roleId } of CONFIG.REP_TIERS) {
			if (!roleId || points < minPoints) continue;
			try {
				const member = await client.members.fetch(guildId, receiverId);
				if (member && !member.roles.keys.includes(roleId)) {
					await member.roles.add(roleId);
					newRoles.push(roleId);

					if (
						CONFIG.ROLES.NOVATO &&
						member.roles.keys.includes(CONFIG.ROLES.NOVATO)
					) {
						await member.roles.remove(CONFIG.ROLES.NOVATO).catch(() => {});
					}
				}
			} catch {
				// member may have left
			}
		}

		return { points, prevPoints, newRoles };
	}

	async sendLogRep(client: UsingClient, data: CreateRepLogI) {
		const channelId = CONFIG.CHANNELS.REP_LOG;
		if (!channelId) {
			console.info(
				`[Rep] ${data.giverName} (${data.giverId}) le dio rep a ${data.receiverName} (${data.receiverId})`,
			);
			return;
		}

		const embed = Embeds.repLogEmbed(data);

		await client.messages.write(channelId, {
			embeds: [embed],
		});
	}
}

export const reputationService = new ReputationService();
