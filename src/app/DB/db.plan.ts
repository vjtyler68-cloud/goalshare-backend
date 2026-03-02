import { PrismaClient, SubscriptionType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptions() {
  const existing = await prisma.subscription.findFirst({
    where: {
      subscriptionType: SubscriptionType.FREE,
    },
  });

  if (existing) {
    console.log(`⚠️  Already exists: ${existing.title}`);
  } else {
    await prisma.subscription.create({
      data: {
        title: 'Free Plan',
        price: 0.0,
        duration: 90,
        subscriptionType: 'FREE',
      },
    });
    console.log('🎉 Subscription seeding complete!');
  }
}

export default seedSubscriptions;
