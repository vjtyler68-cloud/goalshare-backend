"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetRouters = void 0;
const express_1 = __importDefault(require("express"));
const asset_controller_1 = require("./asset.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const parseBody_1 = require("../../middlewares/parseBody");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const asset_validation_1 = require("./asset.validation");
const fileUploader_1 = require("../../utils/fileUploader");
const router = express_1.default.Router();
// Single file upload
router.post('/upload', fileUploader_1.upload.single('file'), (0, auth_1.default)('ANY'), asset_controller_1.AssetController.uploadAsset);
// Multiple files upload
router.post('/upload-multiple', fileUploader_1.upload.array('files'), (0, auth_1.default)('ANY'), asset_controller_1.AssetController.uploadMultipleAssets);
// Delete single asset
router.delete('/delete', (0, auth_1.default)('ANY'), validateRequest_1.default.body(asset_validation_1.AssetValidation.deleteAssetSchema), asset_controller_1.AssetController.deleteAsset);
// Delete multiple assets
router.delete('/delete-multiple', (0, auth_1.default)('ANY'), validateRequest_1.default.body(asset_validation_1.AssetValidation.deleteMultipleAssetsSchema), asset_controller_1.AssetController.deleteMultipleAssets);
// Update single asset
router.put('/update', fileUploader_1.upload.single('file'), (0, auth_1.default)('ANY'), parseBody_1.parseBody, validateRequest_1.default.body(asset_validation_1.AssetValidation.updateAssetSchema), asset_controller_1.AssetController.updateAsset);
// Update multiple assets
router.put('/update-multiple', fileUploader_1.upload.array('files'), (0, auth_1.default)('ANY'), parseBody_1.parseBody, validateRequest_1.default.body(asset_validation_1.AssetValidation.updateMultipleAssetsSchema), asset_controller_1.AssetController.updateMultipleAssets);
exports.AssetRouters = router;
