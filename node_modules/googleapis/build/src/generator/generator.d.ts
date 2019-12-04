import { Schema } from 'googleapis-common';
export interface GeneratorOptions {
    debug?: boolean;
    includePrivate?: boolean;
}
export declare class Generator {
    private transporter;
    private requestQueue;
    private env;
    /**
     * A multi-line string is turned into one line.
     * @param str String to process
     * @return Single line string processed
     */
    private oneLine;
    /**
     * Clean a string of comment tags.
     * @param str String to process
     * @return Single line string processed
     */
    private cleanComments;
    private getPathParams;
    private getSafeParamName;
    private hasResourceParam;
    private options;
    private state;
    /**
     * Generator for generating API endpoints
     * @param options Options for generation
     */
    constructor(options?: GeneratorOptions);
    /**
     * Add a requests to the rate limited queue.
     * @param opts Options to pass to the default transporter
     */
    private request;
    /**
     * Log output of generator. Works just like console.log.
     */
    private log;
    /**
     * Write to the state log, which is used for debugging.
     * @param id DiscoveryRestUrl of the endpoint to log
     * @param message
     */
    private logResult;
    /**
     * Generate all APIs and write to files.
     */
    generateAllAPIs(discoveryUrl: string): Promise<void>;
    generateIndex(metadata: Schema[]): Promise<void>;
    /**
     * Given a discovery doc, parse it and recursively iterate over the various
     * embedded links.
     */
    private getFragmentsForSchema;
    /**
     * Generate API file given discovery URL
     * @param apiDiscoveryUri URL or filename of discovery doc for API
     */
    generateAPI(apiDiscoveryUrl: string): Promise<void>;
    private generate;
}
