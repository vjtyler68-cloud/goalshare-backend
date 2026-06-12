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
exports.visionServices = void 0;
const prisma_1 = require("../../utils/prisma");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const uploadToDigitalOceanAWS_1 = require("../../utils/uploadToDigitalOceanAWS");
const createIntoDb = (id, file, year) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.user.findUnique({
        where: { id },
    });
    let fileUrl = null;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = await uploadToCloudinary(file);
        console.log('Uploaded File URL:', location.Location);
        fileUrl = location.Location;
    }
    const result = yield prisma_1.prisma.vision.create({
        data: {
            year: new Date(year),
            userId: id,
            image: fileUrl,
        },
    });
    return result;
});
const getAllVision = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const visionQuery = new QueryBuilder_1.default(prisma_1.prisma.vision, query);
    const result = yield visionQuery.sort().paginate().execute();
    return result;
});
const getVisionByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const vision = yield prisma_1.prisma.vision.findUnique({
        where: { id },
    });
    return vision;
});
const getMyVision = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const vision = yield prisma_1.prisma.vision.findMany({
        where: { userId },
        select: {
            id: true,
            year: true,
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
    return vision;
});
const updateIntoDb = (id, data, file) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.vision.findUnique({ where: { id } });
    let fileUrl;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = await uploadToCloudinary(file);
        fileUrl = location.Location;
    }
    const updatedVision = yield prisma_1.prisma.vision.update({
        where: { id },
        data: Object.assign({ year: data.year }, (fileUrl && { image: fileUrl })),
    });
    return updatedVision;
});
const deleteIntoDb = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const vision = yield prisma_1.prisma.vision.delete({
        where: { id },
    });
    return vision;
});
exports.visionServices = {
    createIntoDb,
    getAllVision,
    getMyVision,
    getVisionByIdFromDB,
    updateIntoDb,
    deleteIntoDb,
};
