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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivationServices = void 0;
const prisma_1 = require("../../utils/prisma");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const uploadToDigitalOceanAWS_1 = require("../../utils/uploadToDigitalOceanAWS");
const createIntoDb = (id, file, title) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.user.findUnique({
        where: { id },
    });
    let fileUrl = null;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = await uploadToCloudinary(file);
        fileUrl = location.Location;
    }
    const result = yield prisma_1.prisma.motivation.create({
        data: {
            title,
            userId: id,
            image: fileUrl,
        },
    });
    return result;
});
const getAllMotivation = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const motivationQuery = new QueryBuilder_1.default(prisma_1.prisma.motivation, query);
    const result = yield motivationQuery.sort().paginate().execute();
    return result;
});
const getMotivationByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const motivation = yield prisma_1.prisma.motivation.findUnique({
        where: { id },
    });
    return motivation;
});
/** ✅ return all motivation created by the logged-in user */
const getMyMotivation = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const motivations = yield prisma_1.prisma.motivation.findMany({
        where: { userId },
        select: {
            id: true,
            title: true,
            image: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return motivations;
});
/** ✅ delete one */
const deleteIntoDb = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const motivation = yield prisma_1.prisma.motivation.delete({
        where: { id },
    });
    return motivation;
});
/** ✅ update title and/or image */
const updateIntoDb = (id, bodyData, file) => __awaiter(void 0, void 0, void 0, function* () {
    // fetch the existing record first (optional but good for validation)
    yield prisma_1.prisma.motivation.findUnique({ where: { id } });
    let fileUrl;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = await uploadToCloudinary(file);
        fileUrl = location.Location;
    }
    const result = yield prisma_1.prisma.motivation.update({
        where: { id },
        data: Object.assign(Object.assign({}, bodyData), (fileUrl && { image: fileUrl })),
    });
    return result;
});
exports.MotivationServices = {
    createIntoDb,
    getAllMotivation,
    getMotivationByIdFromDB,
    getMyMotivation,
    deleteIntoDb,
    updateIntoDb,
};
