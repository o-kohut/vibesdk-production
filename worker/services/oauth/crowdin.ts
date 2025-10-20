/**
 * Crowdin OAuth Provider
 * Implements Crowdin OAuth 2.0 authentication
 */

import { BaseOAuthProvider } from './base';
import type { OAuthUserInfo } from '../../types/auth-types';
import { OAuthProvider } from '../../types/auth-types';
import { createLogger } from '../../logger';

const logger = createLogger('CrowdinOAuth');

/**
 * Crowdin OAuth Provider implementation
 */
export class CrowdinOAuthProvider extends BaseOAuthProvider {
    protected readonly provider: OAuthProvider = 'crowdin';
    protected readonly authorizationUrl = 'https://accounts.crowdin.com/oauth/authorize';
    protected readonly tokenUrl = 'https://accounts.crowdin.com/oauth/token';
    protected readonly userInfoUrl = ''; // Will be set dynamically based on domain
    protected readonly scopes: string[] = ['user:read'];
    
    /**
     * Decode JWT token to extract payload (without verification)
     * Used to get the domain field for enterprise vs standard detection
     */
    private decodeJWT(token: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }
            
            // Decode base64url payload
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = atob(base64);
            return JSON.parse(jsonPayload);
        } catch (error) {
            logger.error('Failed to decode JWT token', error);
            throw new Error('Invalid JWT token');
        }
    }
    
    /**
     * Get user info from Crowdin
     * Automatically detects enterprise vs standard instance from JWT token
     */
    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
        try {
            // Decode JWT to extract domain
            const payload = this.decodeJWT(accessToken);
            const domain = payload.domain; // null for standard, "<domain>" for enterprise
            
            logger.info('Crowdin OAuth user info request', { 
                domain: domain || 'standard',
                userId: payload.sub 
            });
            
            // Determine API endpoint based on domain
            const apiUrl = domain 
                ? `https://${domain}.api.crowdin.com/api/v2/user`
                : 'https://api.crowdin.com/api/v2/user';
            
            // Fetch user info from Crowdin API
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                logger.error('Failed to get user info', { 
                    status: response.status,
                    error: errorText.substring(0, 200)
                });
                throw new Error('Failed to retrieve user information from Crowdin');
            }
            
            const result = await response.json() as {
                data: {
                    id: number;
                    username: string;
                    email: string;
                    emailVerified?: boolean;
                    fullName?: string; // Standard Crowdin
                    firstName?: string; // Enterprise Crowdin
                    lastName?: string; // Enterprise Crowdin
                    avatarUrl?: string;
                };
            };
            
            const userData = result.data;
            
            let fullName: string;
            if (userData.fullName) {
                fullName = userData.fullName;
            } else if (userData.firstName || userData.lastName) {
                fullName = [userData.firstName, userData.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
            } else {
                fullName = userData.username;
            }
            
            return {
                id: String(userData.id),
                email: userData.email,
                name: fullName,
                picture: userData.avatarUrl,
                emailVerified: userData.emailVerified
            };
        } catch (error) {
            logger.error('Error getting user info', error);
            throw error;
        }
    }
    
    /**
     * Create Crowdin OAuth provider instance
     */
    static create(env: Env, baseUrl: string): CrowdinOAuthProvider {
        if (!env.CROWDIN_CLIENT_ID || !env.CROWDIN_CLIENT_SECRET) {
            throw new Error('Crowdin OAuth credentials not configured');
        }
        
        const redirectUri = `${baseUrl}/api/auth/callback/crowdin`;
        
        return new CrowdinOAuthProvider(
            env.CROWDIN_CLIENT_ID,
            env.CROWDIN_CLIENT_SECRET,
            redirectUri
        );
    }
}

