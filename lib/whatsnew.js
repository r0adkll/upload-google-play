"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.readLocalizedReleaseNotes = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
function readLocalizedReleaseNotes(whatsNewDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (whatsNewDir != undefined && whatsNewDir.length > 0) {
            const releaseNotes = fs.readdirSync(whatsNewDir)
                .filter(value => /whatsnew-.*-.{2,3}\b/.test(value));
            const pattern = /whatsnew-(?<local>.*-.*)/;
            let localizedReleaseNotes = [];
            core.debug(`Found files: ${releaseNotes}`);
            releaseNotes.forEach(value => {
                const matches = value.match(pattern);
                core.debug(`Matches for ${value} = ${matches}`);
                if (matches != undefined && matches.length == 2) {
                    const lang = matches[1];
                    const filePath = path.join(whatsNewDir, value);
                    const content = fs_1.readFileSync(filePath, 'utf-8');
                    if (content != undefined) {
                        core.debug(`Found localized 'whatsnew-*-*' for Lang(${lang})`);
                        localizedReleaseNotes.push({
                            language: lang,
                            text: content
                        });
                    }
                }
            });
            return localizedReleaseNotes;
        }
        return undefined;
    });
}
exports.readLocalizedReleaseNotes = readLocalizedReleaseNotes;
