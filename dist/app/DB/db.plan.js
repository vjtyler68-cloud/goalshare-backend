"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function seedSubscriptions() {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma.subscription.findFirst({
            where: {
                subscriptionType: client_1.SubscriptionType.FREE,
            },
        });
        if (existing) {
            console.log(`⚠️  Already exists: ${existing.title}`);
        }
        else {
            yield prisma.subscription.create({
                data: {
                    title: 'Free Plan',
                    price: 0.0,
                    duration: 90,
                    subscriptionType: 'FREE',
                },
            });
            console.log('🎉 Subscription seeding complete!');
        }
    });
}
exports.default = seedSubscriptions;
