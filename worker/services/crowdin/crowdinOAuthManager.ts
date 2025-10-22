/**
 * Crowdin OAuth Client Manager
 * Manages creation of OAuth clients for user applications
 */

import { StructuredLogger } from '../../logger';

export interface CrowdinOAuthClientParams {
    name: string;
    redirect: string;
    userId: number;
    domain: string | null;
}

export interface CrowdinOAuthClientSuccess {
    success: true;
    clientId: string;
    clientSecret: string;
}

export interface CrowdinOAuthClientError {
    success: false;
    error: string;
}

export type CrowdinOAuthClientResult = CrowdinOAuthClientSuccess | CrowdinOAuthClientError;

interface ClientCredentialsResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface CreateClientResponse {
    id: string;
    organization_id: number | null;
    user_id: number;
    name: string;
    description: string | null;
    secret: string;
    redirect: string;
    revoked: boolean;
    grant_types: string[];
    scopes: string[];
    updated_at: string;
    created_at: string;
}

export class CrowdinOAuthManager {
    private readonly OAUTH_TOKEN_URL = 'https://accounts.crowdin.com/oauth/token';
    private readonly OAUTH_CLIENTS_URL = 'https://accounts.crowdin.com/api/clients';
    private logger: StructuredLogger;
    private clientId: string;
    private clientSecret: string;

    constructor(logger: StructuredLogger, env: Env) {
        this.logger = logger;
        this.clientId = env.CROWDIN_OAUTH_MANAGER_CLIENT_ID;
        this.clientSecret = env.CROWDIN_OAUTH_MANAGER_CLIENT_SECRET;

        if (!this.clientId || !this.clientSecret) {
            this.logger.error('Missing required environment variables for CrowdinOAuthManager', {
                hasClientId: !!this.clientId,
                hasClientSecret: !!this.clientSecret
            });
            throw new Error('CROWDIN_OAUTH_MANAGER_CLIENT_ID and CROWDIN_OAUTH_MANAGER_CLIENT_SECRET must be set for CrowdinOAuthManager');
        }

        this.logger.info('CrowdinOAuthManager initialized successfully', {
            clientId: this.clientId.substring(0, 8) + '...'
        });
    }

    /**
     * Get service token for OAuth client creation
     */
    private async getServiceToken(userId: number, domain: string | null): Promise<string> {
        try {
            this.logger.info('Requesting service token', { userId, domain });
            
            const params = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: '',
                user_id: userId.toString(),
                domain: domain || ''
            });

            const response = await fetch(this.OAUTH_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Failed to get service token', { 
                    status: response.status, 
                    error: errorText.substring(0, 200) 
                });
                throw new Error(`Failed to get service token: ${response.status}`);
            }

            const data = await response.json() as ClientCredentialsResponse;
            this.logger.info('Service token obtained successfully');
            
            return data.access_token;
        } catch (error) {
            this.logger.error('Error getting service token', error);
            throw error;
        }
    }

    /**
     * Create OAuth client in Crowdin
     */
    private async createClient(
        serviceToken: string,
        name: string,
        redirect: string
    ): Promise<CreateClientResponse> {
        try {
            this.logger.info('Creating OAuth client', { name, redirect });

            const response = await fetch(this.OAUTH_CLIENTS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    redirect,
                    scopes: ['*']
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Failed to create OAuth client', { 
                    status: response.status, 
                    error: errorText.substring(0, 200) 
                });
                throw new Error(`Failed to create OAuth client: ${response.status}`);
            }

            const data = await response.json() as CreateClientResponse;
            this.logger.info('OAuth client created successfully', { 
                clientId: data.id,
                name: data.name 
            });
            
            return data;
        } catch (error) {
            this.logger.error('Error creating OAuth client', error);
            throw error;
        }
    }

    /**
     * Create OAuth client for user application
     */
    async createOAuthClient(params: CrowdinOAuthClientParams): Promise<CrowdinOAuthClientResult> {
        try {
            this.logger.info('Starting OAuth client creation', { 
                name: params.name, 
                redirect: params.redirect,
                userId: params.userId,
                domain: params.domain
            });

            // Step 1: Get service token using provided userId and domain
            const serviceToken = await this.getServiceToken(params.userId, params.domain);

            // Step 2: Create OAuth client
            const client = await this.createClient(serviceToken, params.name, params.redirect);

            this.logger.info('OAuth client provisioning completed', { 
                clientId: client.id,
                name: client.name 
            });

            return {
                success: true,
                clientId: client.id,
                clientSecret: client.secret
            };
        } catch (error) {
            this.logger.error('Failed to create OAuth client', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

