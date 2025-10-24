/**
 * Email Whitelist Utility
 * Supports wildcard patterns and exact email matches
 */

import { createLogger } from '../logger';

const logger = createLogger('EmailWhitelist');

/**
 * Parse EMAIL_WHITELIST environment variable
 * Format: comma-separated list of emails and wildcard patterns
 * Examples:
 *   - user@example.com (exact match)
 *   - *@company.com (wildcard domain)
 *   - admin+*@company.com (wildcard in local part)
 *   - *.test@company.com (wildcard in subdomain)
 */
export function parseEmailWhitelist(whitelistEnv?: string): string[] {
    if (!whitelistEnv || whitelistEnv.trim() === '') {
        return [];
    }

    return whitelistEnv
        .split(',')
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0);
}

/**
 * Convert wildcard pattern to RegExp
 * Supports * as wildcard character
 */
function wildcardToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    
    return new RegExp(`^${escaped}$`, 'i'); // case-insensitive
}

/**
 * Check if email matches any pattern in whitelist
 * Returns true if whitelist is empty (open access)
 */
export function isEmailWhitelisted(email: string, whitelist: string[]): boolean {
    // Empty whitelist = no restrictions
    if (whitelist.length === 0) {
        return true;
    }

    const normalizedEmail = email.toLowerCase().trim();

    for (const pattern of whitelist) {
        const normalizedPattern = pattern.toLowerCase().trim();

        // Exact match
        if (normalizedPattern === normalizedEmail) {
            logger.debug('Email matched exact pattern', { 
                email: normalizedEmail, 
                pattern: normalizedPattern 
            });
            return true;
        }

        // Wildcard match
        if (normalizedPattern.includes('*')) {
            const regex = wildcardToRegex(normalizedPattern);
            if (regex.test(normalizedEmail)) {
                logger.debug('Email matched wildcard pattern', { 
                    email: normalizedEmail, 
                    pattern: normalizedPattern 
                });
                return true;
            }
        }
    }

    logger.info('Email not whitelisted', { 
        email: normalizedEmail,
        whitelistPatterns: whitelist.length
    });
    return false;
}

/**
 * Check if email is whitelisted using environment variable
 */
export function checkEmailWhitelist(email: string, env: Env): boolean {
    const whitelist = parseEmailWhitelist(env.EMAIL_WHITELIST);
    return isEmailWhitelisted(email, whitelist);
}

/**
 * Get whitelist configuration for debugging
 */
export function getWhitelistInfo(env: Env): {
    enabled: boolean;
    patternsCount: number;
    patterns: string[];
} {
    const whitelist = parseEmailWhitelist(env.EMAIL_WHITELIST);
    
    return {
        enabled: whitelist.length > 0,
        patternsCount: whitelist.length,
        patterns: whitelist // Be careful exposing this in production
    };
}

