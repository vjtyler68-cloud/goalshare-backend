"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetValidation = void 0;
const zod_1 = require("zod");
const updateAssetSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPath: zod_1.z.string(),
    })
});
const deleteAssetSchema = zod_1.z.object({
    body: zod_1.z.object({
        path: zod_1.z.string(),
    })
});
const updateMultipleAssetsSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPaths: zod_1.z.array(zod_1.z.string().min(1)),
    })
});
const deleteMultipleAssetsSchema = zod_1.z.object({
    body: zod_1.z.object({
        paths: zod_1.z.array(zod_1.z.string().min(1)),
    })
});
exports.AssetValidation = {
    updateAssetSchema, deleteAssetSchema, updateMultipleAssetsSchema,
    deleteMultipleAssetsSchema
};
