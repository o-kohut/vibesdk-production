/**
 * ID Generation Utility
 * Simple wrapper around crypto.randomUUID() for consistent ID generation
 */

import { customAlphabet } from "nanoid";

export function generateId(): string {
    return crypto.randomUUID();
}

export function generateNanoId(): string {
    // Using custom alphabet to exclude `_` character because Crowdin auth doesn't support it
    // Original alphabet: https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
    const nanoid = customAlphabet('useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict', 21);
    return nanoid();
}