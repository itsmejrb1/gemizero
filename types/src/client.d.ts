export class GeminiClient {
    /** @returns {boolean} */
    get initialized(): boolean;
    /**
     * @param {string} [cookieStr]
     * @returns {Promise<void>}
     */
    init(cookieStr?: string): Promise<void>;
    /**
     * @param {string} prompt
     * @param {{ model?: string, metadata?: any[]|null }} [options]
     * @returns {Promise<import('./parser.js').GeminiResponse>}
     */
    sendMessage(prompt: string, { model, metadata }?: {
        model?: string;
        metadata?: any[] | null;
    }): Promise<import("./parser.js").GeminiResponse>;
    /**
     * @param {string} prompt
     * @param {{ model?: string, metadata?: any[]|null }} [options]
     * @yields {string}
     */
    streamMessage(prompt: string, { model, metadata }?: {
        model?: string;
        metadata?: any[] | null;
    }): AsyncGenerator<string, void, unknown>;
    #private;
}
