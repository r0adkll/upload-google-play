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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const edits_1 = require("./edits");
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
});
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const serviceAccountJson = core.getInput('serviceAccountJson', { required: false });
            const serviceAccountJsonRaw = core.getInput('serviceAccountJsonPlainText', { required: false });
            const packageName = core.getInput('packageName', { required: true });
            const releaseFile = core.getInput('releaseFile', { required: false });
            const releaseFiles = ((_b = (_a = core.getInput('releaseFiles', { required: false })) === null || _a === void 0 ? void 0 : _a.split(',')) === null || _b === void 0 ? void 0 : _b.filter(x => x !== '')) || [];
            const releaseName = core.getInput('releaseName', { required: false });
            const track = core.getInput('track', { required: true });
            const inAppUpdatePriority = core.getInput('inAppUpdatePriority', { required: false });
            const userFraction = core.getInput('userFraction', { required: false });
            const whatsNewDir = core.getInput('whatsNewDirectory', { required: false });
            const mappingFile = core.getInput('mappingFile', { required: false });
            // Validate that we have a service account json in some format
            if (!serviceAccountJson && !serviceAccountJsonRaw) {
                console.log("No service account json key provided!");
                core.setFailed("You must provide one of 'serviceAccountJson' or 'serviceAccountJsonPlainText' to use this action");
                return;
            }
            // If the user has provided the raw plain text via secrets, or w/e, then write to file and
            // set appropriate env variable for the auth
            if (serviceAccountJsonRaw) {
                const serviceAccountFile = "./serviceAccountJson.json";
                fs.writeFileSync(serviceAccountFile, serviceAccountJsonRaw, {
                    encoding: 'utf8'
                });
                // Insure that the api can find our service account credentials
                core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountFile);
            }
            if (serviceAccountJson) {
                // Insure that the api can find our service account credentials
                core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountJson);
            }
            // Validate user fraction as a number, and within [0.0, 1.0]
            let userFractionFloat = parseFloat(userFraction);
            if (!isNaN(userFractionFloat)) {
                if (userFractionFloat <= 0.0 || userFractionFloat >= 1.0) {
                    core.setFailed('A provided userFraction must be between 0.0 and 1.0, inclusive-inclusive');
                    return;
                }
            }
            else {
                userFractionFloat = undefined;
            }
            // Validate the inAppUpdatePriority to be a valid number in within [0, 5]
            let inAppUpdatePriorityInt = parseInt(inAppUpdatePriority);
            if (!isNaN(inAppUpdatePriorityInt)) {
                if (inAppUpdatePriorityInt < 0 || inAppUpdatePriorityInt > 5) {
                    core.setFailed('inAppUpdatePriority must be between 0 and 5, inclusive-inclusive');
                    return;
                }
            }
            else {
                inAppUpdatePriorityInt = undefined;
            }
            // Check release files while maintaining backward compatibility
            let validatedReleaseFiles = [];
            if (releaseFiles.length == 0 && !releaseFile) {
                core.setFailed(`You must provide either 'releaseFile' or 'releaseFiles' in your configuration.`);
                return;
            }
            else if (releaseFiles.length == 0 && releaseFile) {
                core.warning(`WARNING!! 'releaseFile' is deprecated and will be removed in a future release. Please migrate to 'releaseFiles'.`);
                core.debug(`Validating ${releaseFile} exists`);
                if (!fs.existsSync(releaseFile)) {
                    core.setFailed(`Unable to find release file @ ${releaseFile}`);
                    return;
                }
                else {
                    validatedReleaseFiles = [releaseFile];
                }
            }
            else if (releaseFiles.length > 0) {
                for (const file of releaseFiles) {
                    core.debug(`Validating ${file} exists`);
                    if (!fs.existsSync(file)) {
                        core.setFailed(`Unable to find release file @ ${file}`);
                        return;
                    }
                }
                validatedReleaseFiles = releaseFiles;
            }
            if (whatsNewDir != undefined && whatsNewDir.length > 0 && !fs.existsSync(whatsNewDir)) {
                core.setFailed(`Unable to find 'whatsnew' directory @ ${whatsNewDir}`);
                return;
            }
            if (mappingFile != undefined && mappingFile.length > 0 && !fs.existsSync(mappingFile)) {
                core.setFailed(`Unable to find 'mappingFile' @ ${mappingFile}`);
                return;
            }
            const authClient = yield auth.getClient();
            yield edits_1.uploadToPlayStore({
                auth: authClient,
                applicationId: packageName,
                track: track,
                inAppUpdatePriority: inAppUpdatePriorityInt || 0,
                userFraction: userFractionFloat,
                whatsNewDir: whatsNewDir,
                mappingFile: mappingFile,
                name: releaseName
            }, validatedReleaseFiles);
            console.log(`Finished uploading to the Play Store`);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
