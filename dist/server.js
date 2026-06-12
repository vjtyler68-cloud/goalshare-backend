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
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const DB_1 = __importDefault(require("./app/DB"));
const webSocket_1 = require("./app/middlewares/webSocket");
// import seedSubscriptions from './app/DB/db.plan';
const port = config_1.default.port || 5000;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = (0, http_1.createServer)(app_1.default);
        server.listen(port, () => __awaiter(this, void 0, void 0, function* () {
            console.log('Server is running on port ', port);
            yield (0, DB_1.default)();
            // await seedSubscriptions();
            try {
                yield (0, webSocket_1.setupWebSocket)(server);
            }
            catch (error) {
                console.error('Failed to setup WebSocket:', error);
                // Optionally close server on failure
                server.close(() => process.exit(1));
            }
        }));
        const exitHandler = () => {
            if (server) {
                server.close(() => {
                    console.info('Server closed!');
                });
            }
            process.exit(1);
        };
        process.on('uncaughtException', error => {
            console.log(error);
            exitHandler();
        });
        process.on('unhandledRejection', error => {
            console.log(error);
            exitHandler();
        });
    });
}
main();
