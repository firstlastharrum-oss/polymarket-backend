import { Injectable } from '@nestjs/common';
import { ConnectionService } from '../../src/connection/connection.service';

@Injectable()
export class GamificationService {
  constructor(private prisma: ConnectionService) {}

  async getLeaderboard(type: string, limit: number = 10) {
    let orderBy: any = { reputationScore: 'desc' };
    
    switch (type) {
      case 'earnings':
        orderBy = { totalEarnings: 'desc' };
        break;
      case 'volume':
        orderBy = { totalVolume: 'desc' };
        break;
      case 'streak':
        orderBy = { currentStreak: 'desc' };
        break;
      case 'accuracy':
        orderBy = { accuracy: 'desc' }; 
        break;
      case 'creators':
        orderBy = { betsCreated: 'desc' };
        break;
    }

    const profiles = await this.prisma.gamificationProfile.findMany({
      take: Number(limit) * 2,
      orderBy: orderBy,
      include: {
        user: {
          select: {
            username: true,
            id: true,
            setting: true
          }
        }
      }
    });
    const visible = profiles.filter((p: any) => {
      const vis = String((p.user?.setting as any)?.profile_visibility || 'public').toLowerCase();
      return vis !== 'private';
    }).slice(0, Number(limit));
    return visible.map((p: any) => ({
      id: p.user?.id,
      name: p.user?.username || `user-${p.user?.id}`,
      reputationScore: Number(p.reputationScore || 50),
      accuracy: Number(p.accuracy || 0),
      totalEarnings: Number(p.totalEarnings || 0),
      totalVolume: Number(p.totalVolume || 0),
      betsCreated: Number(p.betsCreated || 0),
      currentStreak: Number(p.currentStreak || 0),
      tier: String(p.tier || 'Bronze')
    }));
  }

  async incrementBetCreation(userId: number) {
    // Ensure profile exists
    await this.getUserStats(userId);
    
    await this.prisma.gamificationProfile.update({
        where: { userId: Number(userId) },
        data: { 
            betsCreated: { increment: 1 }
        }
    });
  }

  async updateResolutionStats(userId: number, isWin: boolean, profitOrLoss: number) {
    const profile = await this.getUserStats(userId);
    
    let { wins, losses, currentStreak, maxStreak, totalEarnings } = profile;
    
    // Convert Decimal to number for calculation if needed, or keep as is. 
    // Prisma returns Decimal as object or string usually, but here we update using Prisma API.
    
    if (isWin) {
        wins++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        // totalEarnings is Decimal, using increment in update is safer
    } else {
        losses++;
        currentStreak = 0;
    }

    const totalResolutions = wins + losses;
    const accuracy = totalResolutions > 0 ? (wins / totalResolutions) * 100 : 0;

    await this.prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: {
            wins,
            losses,
            currentStreak,
            maxStreak,
            accuracy,
            totalEarnings: { increment: profitOrLoss }
        }
    });
  }

  async getUserStats(userId: number) {
    let profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId: Number(userId) },
      include: {
        user: {
          select: {
            username: true,
            createdAt: true,
            setting: true
          }
        }
      }
    });

    if (!profile) {
      // Create profile if not exists
      profile = await this.prisma.gamificationProfile.create({
        data: {
            userId: Number(userId)
        },
        include: {
            user: {
                select: {
                    username: true,
                    createdAt: true,
                    setting: true
                }
            }
        }
      });
    }
    
    return profile;
  }

  async getPublicProfile(userId: number) {
    const profile = await this.getUserStats(userId);
    const vis = String(((profile.user as any)?.setting || {})?.profile_visibility || 'public').toLowerCase();
    if (vis === 'private') {
      return { success: true, visibility: 'private' };
    }
    const username = (profile.user as any)?.username || `user-${userId}`;
    const betsCreated = Number(profile.betsCreated || 0);
    const reputationScore = Number(profile.reputationScore || 50);
    const accuracy = Number(profile.accuracy || 0);
    const tier = String(profile.tier || 'Bronze');
    const totalEarnings = Number(profile.totalEarnings || 0);
    const totalVolume = Number(profile.totalVolume || 0);
    const createdAt = (profile.user as any)?.createdAt || null;
    const createdMarkets = await this.prisma.match.findMany({
      where: { OR: [{ betA: { creatorId: userId } }, { betB: { creatorId: userId } }] },
      include: { pool: true },
    });
    const activeMarkets = createdMarkets.filter((m: any) => {
      const s = String(m.pool?.status || '');
      return ['LIVE', 'CLOSED', 'PROVISIONAL', 'DISPUTED', 'RESOLUTION_OPEN', 'RESOLUTION_CALCULATION'].includes(s);
    }).length;
    const resolvedMarkets = createdMarkets.filter((m: any) => {
      const s = String(m.pool?.status || '');
      return ['RESOLVED', 'PAID_OUT', 'FINALIZED', 'SETTLED'].includes(s);
    }).length;
    const marketVolumeGenerated = createdMarkets.reduce((acc: number, m: any) => acc + Number(m.pool?.totalPoolAmount || 0), 0);
    const commissionEarned = await (this.prisma as any).creatorEarnings.aggregate({
      where: { creatorId: userId, status: 'PAID' },
      _sum: { commissionEarned: true },
    });
    const votes = await this.prisma.resolutionVote.findMany({
      where: { userId },
      include: { pool: true },
    });
    const finalizedVotes = votes.filter((v: any) => ['RESOLVED', 'PAID_OUT', 'FINALIZED', 'SETTLED'].includes(String(v.pool?.status || '')));
    const totalResolutions = finalizedVotes.length;
    const correctResolutions = finalizedVotes.filter((v: any) => String(v.outcome || '').toUpperCase() === String(v.pool?.outcome || '').toUpperCase()).length;
    const incorrectResolutions = totalResolutions - correctResolutions;
    const resolutionStakeTotal = finalizedVotes.reduce((acc: number, v: any) => acc + Number(v.amount || 0), 0);
    const rewardEvents = await this.prisma.eventLog.findMany({
      where: { type: 'OracleRewardPaid' },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const oracleRewards = rewardEvents.reduce((acc: number, e: any) => {
      const payload = e.payload as any;
      return acc + (Number(payload?.userId) === Number(userId) ? Number(payload?.amount || 0) : 0);
    }, 0);
    const positions = await this.prisma.position.findMany({
      where: { userId },
      include: { pool: true },
    });
    const finalizedPositions = positions.filter((p: any) => ['RESOLVED', 'PAID_OUT', 'FINALIZED', 'SETTLED'].includes(String(p.pool?.status || '')));
    const bettingVolume = finalizedPositions.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    const uniqueMarketIds = new Set<number>();
    for (const p of finalizedPositions) uniqueMarketIds.add(Number(p.poolId));
    for (const v of finalizedVotes) uniqueMarketIds.add(Number(v.poolId));
    const uniqueMarketsParticipated = uniqueMarketIds.size;
    const commissionsSum = Number(commissionEarned?._sum?.commissionEarned || 0);
    const oracleRewardsSum = oracleRewards;
    const bettingProfitLoss = Number(totalEarnings) - commissionsSum - oracleRewardsSum;
    return {
      success: true,
      visibility: 'public',
      identity: { id: userId, name: username, createdAt },
      reputation: { score: reputationScore, tier, accuracy: totalResolutions > 0 ? (correctResolutions / totalResolutions) * 100 : 0 },
      creator: {
        marketsCreated: betsCreated,
        activeMarkets: activeMarkets,
        resolvedMarkets: resolvedMarkets,
        marketVolumeGenerated,
        commissionEarned: commissionsSum,
      },
      resolver: {
        totalResolutions,
        correctResolutions,
        incorrectResolutions,
        stakeCommitted: resolutionStakeTotal,
        rewardsEarned: oracleRewardsSum,
        accuracyRate: totalResolutions > 0 ? (correctResolutions / totalResolutions) * 100 : 0,
      },
      earnings: {
        bettingProfitLoss,
        creatorCommissions: commissionsSum,
        oracleRewards: oracleRewardsSum,
        totalLifetime: Number(totalEarnings),
      },
      activity: {
        totalBettingVolume: bettingVolume,
        totalStakeCommitted: bettingVolume + resolutionStakeTotal,
        uniqueMarketsParticipated,
      },
    };
  }
}
