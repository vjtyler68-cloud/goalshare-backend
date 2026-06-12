"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const AppError_1 = __importDefault(require("../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
let initialIo;
const initSocket = (server) => {
    initialIo = new socket_io_1.Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true,
        },
        transports: ['websocket', 'polling']
    });
    return initialIo;
};
exports.initSocket = initSocket;
const getSocket = () => {
    if (!initialIo) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Socket.io instance not initialized yet!');
    }
    return initialIo;
};
exports.getSocket = getSocket;
